import { requireOwnerUser } from '../../src/auth.js';
import { json, parseJson, preflight } from '../../src/http.js';

type PatchBody = { userId: string; status: 'pending' | 'active' | 'suspended' | 'revoked' };
export function OPTIONS(request: Request) { return preflight(request); }

export async function GET(request: Request) {
  try {
    const { client } = await requireOwnerUser(request);
    const { data: access, error } = await client.from('account_access').select('user_id,status,is_owner,approved_at,suspended_at,created_at').order('created_at', { ascending: true });
    if (error) return json(request, { error: 'access_list_failed' }, 500);
    const ids = (access ?? []).map((row: { user_id: string }) => row.user_id);
    const { data: profiles } = ids.length ? await client.from('profiles').select('user_id,display_name,avatar_url').in('user_id', ids) : { data: [] };
    const profileById = new Map((profiles ?? []).map((row: { user_id: string }) => [row.user_id, row]));
    return json(request, { users: (access ?? []).map((row: { user_id: string }) => ({ ...row, profile: profileById.get(row.user_id) ?? null })) });
  } catch (error) {
    if (error instanceof Response) return json(request, { error: await error.text() }, error.status);
    return json(request, { error: 'access_list_failed' }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId: ownerId, client } = await requireOwnerUser(request);
    const body = await parseJson<PatchBody>(request);
    if (!body.userId || !['pending','active','suspended','revoked'].includes(body.status)) return json(request, { error: 'invalid_access_change' }, 400);
    if (body.userId === ownerId && body.status !== 'active') return json(request, { error: 'owner_self_lockout_blocked' }, 409);
    const now = new Date().toISOString();
    const patch = body.status === 'active'
      ? { status: 'active', approved_by: ownerId, approved_at: now, suspended_at: null }
      : body.status === 'suspended'
        ? { status: 'suspended', suspended_at: now }
        : { status: body.status };
    const { data, error } = await client.from('account_access').update(patch).eq('user_id', body.userId).select('user_id,status,is_owner,approved_at,suspended_at').maybeSingle();
    if (error || !data) return json(request, { error: 'access_change_failed' }, 404);
    return json(request, { user: data });
  } catch (error) {
    if (error instanceof Response) return json(request, { error: await error.text() }, error.status);
    return json(request, { error: 'access_change_failed' }, 500);
  }
}
