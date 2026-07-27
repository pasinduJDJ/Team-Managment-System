import { allowedOrigins } from './config.ts';

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const configured = allowedOrigins();
  const selectedOrigin =
    origin && configured.includes(origin)
      ? origin
      : configured[0] || 'http://localhost:4200';

  return {
    'Access-Control-Allow-Origin': selectedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
