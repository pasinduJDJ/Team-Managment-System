import { requireEnv } from '../_shared/config.ts';
import { HttpError, errorResponse, json, optionsResponse, readJson } from '../_shared/http.ts';
import {
  dbInsertFromCanonical,
  memberFromGooglePayload,
  normalizeEmail,
  normalizePhone,
} from '../_shared/mapping.ts';
import { adminClient } from '../_shared/supabase.ts';
import type { GoogleWebhookPayload } from '../_shared/types.ts';

function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }

  return difference === 0;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function submissionKey(payload: GoogleWebhookPayload): Promise<string> {
  if (payload.submissionId?.trim()) return payload.submissionId.trim();

  if (payload.sheetId && payload.sheetName && payload.rowNumber) {
    return `${payload.sheetId}:${payload.sheetName}:${payload.rowNumber}`;
  }

  return `hash:${await sha256(JSON.stringify(payload))}`;
}

async function findDuplicates(
  client: ReturnType<typeof adminClient>,
  mobile: string,
  email?: string | null,
): Promise<{
  ids: string[];
  reasons: string[];
}> {
  const found = new Map<string, string[]>();
  const normalizedMobile = normalizePhone(mobile);
  const normalizedEmail = normalizeEmail(email);

  if (normalizedMobile) {
    const { data, error } = await client
      .from('old_boys')
      .select('id')
      .eq('mobile_normalized', normalizedMobile)
      .limit(20);
    if (error) throw error;
    for (const row of data || []) {
      found.set(row.id, [...(found.get(row.id) || []), 'exact_mobile']);
    }
  }

  if (normalizedEmail) {
    const { data, error } = await client
      .from('old_boys')
      .select('id')
      .eq('email_normalized', normalizedEmail)
      .limit(20);
    if (error) throw error;
    for (const row of data || []) {
      found.set(row.id, [...(found.get(row.id) || []), 'exact_email']);
    }
  }

  return {
    ids: [...found.keys()],
    reasons: [...new Set([...found.values()].flat())],
  };
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return optionsResponse(request);
  if (request.method !== 'POST') {
    return json(request, {
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for this webhook.' },
    }, 405);
  }

  const client = adminClient();
  let syncRecordId: string | null = null;

  try {
    const suppliedSecret = request.headers.get('x-webhook-secret') || '';
    const expectedSecret = requireEnv('GOOGLE_WEBHOOK_SECRET');

    if (!suppliedSecret || !constantTimeEqual(suppliedSecret, expectedSecret)) {
      throw new HttpError(401, 'Webhook secret is missing or invalid.', 'INVALID_WEBHOOK_SECRET');
    }

    const originalPayload = await readJson<GoogleWebhookPayload>(request);
    const key = await submissionKey(originalPayload);
    const payload: GoogleWebhookPayload = {
      ...originalPayload,
      submissionId: key,
    };
    const payloadHash = await sha256(JSON.stringify(payload));
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

    const { data: insertedSync, error: syncInsertError } = await client
      .from('sync_records')
      .insert({
        submission_key: key,
        source_sheet_id: payload.sheetId || null,
        source_sheet_name: payload.sheetName || null,
        source_row_number: payload.rowNumber || null,
        request_id: requestId,
        payload_hash: payloadHash,
        payload,
        status: 'received',
      })
      .select('id')
      .single();

    if (!syncInsertError) {
      syncRecordId = insertedSync.id;
    } else if (syncInsertError.code === '23505') {
      const { data: existing, error: existingError } = await client
        .from('sync_records')
        .select(
          'id,status,member_id,duplicate_member_ids,duplicate_reasons,error_code,error_message,processed_at,last_attempt_at,attempt_count',
        )
        .eq('submission_key', key)
        .single();

      if (existingError || !existing) {
        throw new HttpError(500, 'Existing sync record could not be loaded.', 'SYNC_READ_FAILED');
      }

      if (['processed', 'duplicate'].includes(existing.status) && existing.member_id) {
        return json(request, {
          ok: true,
          idempotentReplay: true,
          duplicateWarning: existing.status === 'duplicate',
          sync: existing,
        }, 200);
      }

      const lastAttempt = existing.last_attempt_at
        ? Date.parse(existing.last_attempt_at)
        : 0;
      const isStale = !lastAttempt || Date.now() - lastAttempt > 120000;

      if (existing.status === 'received' && !isStale) {
        return json(request, {
          ok: true,
          processing: true,
          idempotentReplay: true,
          sync: existing,
        }, 202);
      }

      syncRecordId = existing.id;
      const { error: retryUpdateError } = await client
        .from('sync_records')
        .update({
          status: 'received',
          request_id: requestId,
          payload_hash: payloadHash,
          payload,
          attempt_count: Number(existing.attempt_count || 1) + 1,
          error_code: null,
          error_message: null,
          processed_at: null,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (retryUpdateError) {
        console.error(retryUpdateError);
        throw new HttpError(500, 'Failed sync record could not be prepared for retry.', 'SYNC_RETRY_FAILED');
      }
    } else {
      console.error(syncInsertError);
      throw new HttpError(500, 'Sync record could not be created.', 'SYNC_RECORD_FAILED');
    }

    // Recovery path: a previous invocation may have inserted the member but
    // failed before marking the sync record as processed.
    const { data: priorMember, error: priorMemberError } = await client
      .from('old_boys')
      .select('id,status')
      .eq('source_submission_id', key)
      .maybeSingle();

    if (priorMemberError) {
      console.error(priorMemberError);
      throw new HttpError(500, 'Existing member state could not be checked.', 'MEMBER_RECOVERY_CHECK_FAILED');
    }

    if (priorMember) {
      const priorIsDuplicate = priorMember.status === 'duplicate';
      await client
        .from('sync_records')
        .update({
          status: priorIsDuplicate ? 'duplicate' : 'processed',
          member_id: priorMember.id,
          processed_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', syncRecordId);

      return json(request, {
        ok: true,
        idempotentReplay: true,
        memberId: priorMember.id,
        memberStatus: priorMember.status,
        duplicateWarning: priorIsDuplicate,
      }, 200);
    }

    const member = memberFromGooglePayload(payload);
    const duplicates = await findDuplicates(client, member.mobile, member.email);
    const status = duplicates.ids.length ? 'duplicate' : 'pending';

    const { data: createdMember, error: memberInsertError } = await client
      .from('old_boys')
      .insert(dbInsertFromCanonical(
        member,
        payload,
        status,
        duplicates.ids[0] || null,
      ))
      .select('id,status')
      .single();

    if (memberInsertError) {
      if (memberInsertError.code === '23505') {
        const { data: racedMember } = await client
          .from('old_boys')
          .select('id,status')
          .eq('source_submission_id', key)
          .single();

        if (racedMember) {
          await client
            .from('sync_records')
            .update({
              status: racedMember.status === 'duplicate' ? 'duplicate' : 'processed',
              member_id: racedMember.id,
              processed_at: new Date().toISOString(),
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', syncRecordId);

          return json(request, {
            ok: true,
            idempotentReplay: true,
            memberId: racedMember.id,
            memberStatus: racedMember.status,
            duplicateWarning: racedMember.status === 'duplicate',
          }, 200);
        }
      }

      console.error(memberInsertError);
      throw new HttpError(500, 'Old Boy record could not be created.', 'MEMBER_INSERT_FAILED');
    }

    const finalSyncStatus = duplicates.ids.length ? 'duplicate' : 'processed';
    const { error: finalSyncError } = await client
      .from('sync_records')
      .update({
        status: finalSyncStatus,
        member_id: createdMember.id,
        duplicate_member_ids: duplicates.ids,
        duplicate_reasons: duplicates.reasons,
        processed_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', syncRecordId);

    if (finalSyncError) {
      console.error(finalSyncError);
      throw new HttpError(500, 'Member was created but sync status was not finalized.', 'SYNC_FINALIZE_FAILED');
    }

    return json(request, {
      ok: true,
      idempotentReplay: false,
      memberId: createdMember.id,
      memberStatus: createdMember.status,
      duplicateWarning: duplicates.ids.length > 0,
      duplicateMemberIds: duplicates.ids,
      duplicateReasons: duplicates.reasons,
    }, 201);
  } catch (error) {
    if (syncRecordId) {
      const code = error instanceof HttpError ? error.code : 'UNEXPECTED_ERROR';
      const message = error instanceof Error ? error.message : 'Unknown error';

      await client
        .from('sync_records')
        .update({
          status: 'failed',
          error_code: code,
          error_message: message.slice(0, 1000),
          processed_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', syncRecordId);
    }

    return errorResponse(request, error);
  }
});
