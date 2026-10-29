import { getAuth } from "@/lib/auth";
import { cmsHostGuard } from "@/lib/cms-host";

export const dynamic = "force-dynamic";

// Better Auth's endpoints: /api/auth/sign-in/email, /two-factor/*, /admin/*, ...
async function handle(request: Request) {
  return cmsHostGuard(request) ?? getAuth().handler(request);
}

export { handle as GET, handle as POST };
