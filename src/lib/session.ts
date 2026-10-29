import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "@/lib/auth";
import { asRole, type Role } from "@/lib/roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  twoFactorEnabled: boolean;
};

// The signed-in editor user, or null. Cached per request, so layouts and pages can both call it.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session || session.user.banned) return null;
  const u = session.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: asRole(u.role),
    twoFactorEnabled: Boolean(u.twoFactorEnabled),
  };
});

// For pages: send anonymous visitors to the login screen.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// For route handlers: returns the user, or a ready-made 401 / 403 response.
export async function requireApiUser(allow?: (role: Role) => boolean): Promise<CurrentUser | Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Belum masuk." }, { status: 401 });
  if (allow && !allow(user.role)) return Response.json({ error: "Anda tidak punya akses." }, { status: 403 });
  return user;
}
