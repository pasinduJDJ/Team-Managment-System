import { corsHeaders } from './cors.ts';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'REQUEST_ERROR',
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function errorResponse(request: Request, error: unknown): Response {
  if (error instanceof HttpError) {
    return json(request, {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    }, error.status);
  }

  console.error(error);
  return json(request, {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'The backend could not complete the request.',
    },
  }, 500);
}

export function optionsResponse(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function readJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json.', 'UNSUPPORTED_MEDIA_TYPE');
  }

  try {
    return await request.json() as T;
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON.', 'INVALID_JSON');
  }
}
