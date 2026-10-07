import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import app, { type Env } from './index';
interface CloudflareEnv extends Env { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string; }
let cachedDomain = '';
let cachedKeys: ReturnType<typeof createRemoteJWKSet> | undefined;
function accessKeys(domain: string) {
  if (!cachedKeys || cachedDomain !== domain) {
    cachedKeys = createRemoteJWKSet(new URL(domain + '/cdn-cgi/access/certs'));
    cachedDomain = domain;
  }
  return cachedKeys;
}
function denied(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
// The optional verifier is for local tests; HTTP clients cannot supply it.
export async function handleCloudflareRequest(request: Request, env: CloudflareEnv, testKeys?: JWTVerifyGetKey): Promise<Response> {
  const domain = env.ACCESS_TEAM_DOMAIN?.replace(/\/$/, '');
  const audience = env.ACCESS_AUD?.trim();
  if (!domain || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(domain) || !audience) {
    return denied('Finish Cloudflare Access setup: set ACCESS_TEAM_DOMAIN and ACCESS_AUD, then redeploy.', 503);
  }
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return denied('Sign in through Cloudflare Access to use Paan Party.', 401);
  let owner: string;
  try {
    const { payload } = await jwtVerify(token, testKeys ?? accessKeys(domain), { issuer: domain, audience, algorithms: ['RS256'] });
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 256) return denied('A signed-in user identity is required.', 401);
    owner = payload.sub;
  } catch {
    return denied('Your sign-in has expired or could not be verified. Sign in again through Cloudflare Access.', 401);
  }
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) if (name.startsWith('oai-authenticated-user-')) headers.delete(name);
  headers.set('oai-authenticated-user-id', owner);
  return app.fetch(new Request(request, { headers }), { ...env, DEV_MODE: false });
}
export default { fetch(request: Request, env: CloudflareEnv) { return handleCloudflareRequest(request, env); } };
