import "server-only";
import { cmsHostGuard, originGuard } from "@/lib/cms-host";
import type { Role } from "@/lib/roles";
import { requireApiUser, type CurrentUser } from "@/lib/session";

type Handler = (user: CurrentUser) => Promise<Response>;

// Wraps an editor API route: must be on the CMS host, signed in, and (for writes) from the editor's
// own origin. `allow` narrows it to some roles. Order matters: nothing is read before these pass.
export async function editorRoute(
  request: Request,
  handler: Handler,
  opts: { write?: boolean; allow?: (role: Role) => boolean } = {},
): Promise<Response> {
  const blocked = cmsHostGuard(request) ?? (opts.write ? originGuard(request) : null);
  if (blocked) return blocked;
  const user = await requireApiUser(opts.allow);
  if (user instanceof Response) return user;
  return handler(user);
}

export async function readJson(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return Response.json({ error: "Data tidak terbaca." }, { status: 400 });
  }
}

export const jsonError = (error: string, status: number, fields?: Record<string, string>) =>
  Response.json(fields ? { error, fields } : { error }, { status });
