/**
 * BMV Old Boys Digital Diary — Google Form / Sheet Connector
 *
 * REQUIRED: Fill the blank CONFIG values below before installing the trigger.
 * Do not place these private values in the Angular frontend.
 */
const CONFIG = {
  // Example format:
  // https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-form-intake
  INTAKE_FUNCTION_URL: '',

  // Must match the Supabase Edge Function secret:
  WEBHOOK_SECRET: '',

  // Exact tab name linked to your Google Form:
  RESPONSE_SHEET_NAME: '',

  // Status columns added by this script:
  STATUS_COLUMN: 'Diary Sync Status',
  MESSAGE_COLUMN: 'Diary Sync Message',
  MEMBER_ID_COLUMN: 'Diary Member ID',
  SYNCED_AT_COLUMN: 'Diary Synced At',

  // Rows with these statuses can be retried:
  RETRY_STATUSES: ['FAILED', 'RETRY'],
};

/**
 * Install this as an "On form submit" trigger from Apps Script.
 */
function onFormSubmit(event) {
  if (!event || !event.range) {
    throw new Error('onFormSubmit must run from a spreadsheet form-submit trigger.');
  }

  const sheet = event.range.getSheet();
  if (CONFIG.RESPONSE_SHEET_NAME && sheet.getName() !== CONFIG.RESPONSE_SHEET_NAME) {
    return;
  }

  syncRow_(sheet, event.range.getRow());
}

/**
 * Run once after all CONFIG values are filled.
 */
function installFormSubmitTrigger() {
  validateConfig_();

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'onFormSubmit')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  SpreadsheetApp.getUi().alert('Form-submit trigger installed.');
}

/**
 * Retry rows marked FAILED or RETRY.
 */
function retryFailedRows() {
  validateConfig_();

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CONFIG.RESPONSE_SHEET_NAME);
  if (!sheet) throw new Error('Configured response sheet was not found.');

  const columns = ensureStatusColumns_(sheet);
  const lastRow = sheet.getLastRow();

  for (let row = 2; row <= lastRow; row += 1) {
    const status = String(sheet.getRange(row, columns.status).getValue()).trim().toUpperCase();
    if (CONFIG.RETRY_STATUSES.indexOf(status) !== -1) {
      syncRow_(sheet, row);
      Utilities.sleep(250);
    }
  }
}

/**
 * Tests the public health endpoint without exposing secret values.
 */
function testBackendHealth() {
  validateUrl_(CONFIG.INTAKE_FUNCTION_URL);
  const healthUrl = CONFIG.INTAKE_FUNCTION_URL.replace(/google-form-intake\/?$/, 'health');
  const response = UrlFetchApp.fetch(healthUrl, { muteHttpExceptions: true });
  Logger.log(response.getResponseCode());
  Logger.log(response.getContentText());
}

function syncRow_(sheet, rowNumber) {
  validateConfig_();

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const columns = ensureStatusColumns_(sheet);
    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
    const rowValues = sheet.getRange(rowNumber, 1, 1, lastColumn).getDisplayValues()[0];

    const ignoredHeaders = [
      CONFIG.STATUS_COLUMN,
      CONFIG.MESSAGE_COLUMN,
      CONFIG.MEMBER_ID_COLUMN,
      CONFIG.SYNCED_AT_COLUMN,
    ];

    const values = {};
    headers.forEach((header, index) => {
      if (header && ignoredHeaders.indexOf(header) === -1) {
        values[header] = rowValues[index];
      }
    });

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const payload = {
      submissionId: [
        spreadsheet.getId(),
        sheet.getSheetId(),
        rowNumber,
      ].join(':'),
      submittedAt: extractTimestamp_(headers, rowValues),
      sheetId: spreadsheet.getId(),
      sheetName: sheet.getName(),
      rowNumber: rowNumber,
      values: values,
    };

    sheet.getRange(rowNumber, columns.status).setValue('SENDING');
    sheet.getRange(rowNumber, columns.message).setValue('');

    const response = UrlFetchApp.fetch(CONFIG.INTAKE_FUNCTION_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-webhook-secret': CONFIG.WEBHOOK_SECRET,
        'x-request-id': Utilities.getUuid(),
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    let result = {};

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      result = { raw: responseText };
    }

    if (statusCode >= 200 && statusCode < 300) {
      if (result.processing) {
        sheet.getRange(rowNumber, columns.status).setValue('RETRY');
        sheet.getRange(rowNumber, columns.message).setValue(
          'A previous request is still processing. Retry this row shortly.',
        );
        return;
      }

      const memberId = result.memberId || (result.sync && result.sync.member_id) || '';
      const message = result.idempotentReplay
        ? 'Already synced previously.'
        : result.duplicateWarning
          ? 'Synced with duplicate warning.'
          : 'Synced successfully.';

      const duplicateStatus = result.duplicateWarning
        || (result.sync && result.sync.status === 'duplicate');

      sheet.getRange(rowNumber, columns.status).setValue(
        duplicateStatus ? 'DUPLICATE' : 'SYNCED',
      );
      sheet.getRange(rowNumber, columns.message).setValue(message);
      sheet.getRange(rowNumber, columns.memberId).setValue(memberId);
      sheet.getRange(rowNumber, columns.syncedAt).setValue(new Date());
    } else {
      const message = result.error && result.error.message
        ? result.error.message
        : 'HTTP ' + statusCode + ': ' + responseText.slice(0, 500);

      sheet.getRange(rowNumber, columns.status).setValue('FAILED');
      sheet.getRange(rowNumber, columns.message).setValue(message);
    }
  } catch (error) {
    const columns = ensureStatusColumns_(sheet);
    sheet.getRange(rowNumber, columns.status).setValue('FAILED');
    sheet.getRange(rowNumber, columns.message).setValue(String(error).slice(0, 500));
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function ensureStatusColumns_(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getDisplayValues()[0];

  const required = [
    CONFIG.STATUS_COLUMN,
    CONFIG.MESSAGE_COLUMN,
    CONFIG.MEMBER_ID_COLUMN,
    CONFIG.SYNCED_AT_COLUMN,
  ];

  required.forEach(header => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      headers.push(header);
    }
  });

  return {
    status: headers.indexOf(CONFIG.STATUS_COLUMN) + 1,
    message: headers.indexOf(CONFIG.MESSAGE_COLUMN) + 1,
    memberId: headers.indexOf(CONFIG.MEMBER_ID_COLUMN) + 1,
    syncedAt: headers.indexOf(CONFIG.SYNCED_AT_COLUMN) + 1,
  };
}

function extractTimestamp_(headers, rowValues) {
  const index = headers.findIndex(header => String(header).trim().toLowerCase() === 'timestamp');
  const value = index >= 0 ? rowValues[index] : '';

  if (!value) return new Date().toISOString();

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function validateConfig_() {
  const missing = [];
  if (!CONFIG.INTAKE_FUNCTION_URL) missing.push('INTAKE_FUNCTION_URL');
  if (!CONFIG.WEBHOOK_SECRET) missing.push('WEBHOOK_SECRET');
  if (!CONFIG.RESPONSE_SHEET_NAME) missing.push('RESPONSE_SHEET_NAME');

  if (missing.length) {
    throw new Error('Fill these CONFIG values first: ' + missing.join(', '));
  }

  validateUrl_(CONFIG.INTAKE_FUNCTION_URL);
}

function validateUrl_(url) {
  if (!/^https:\/\/.+\/functions\/v1\/google-form-intake\/?$/.test(url)) {
    throw new Error('INTAKE_FUNCTION_URL is not in the expected Supabase format.');
  }
}
