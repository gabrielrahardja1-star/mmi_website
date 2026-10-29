"use client";

import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Same-origin client for the editor screens. Talks to /api/auth on the editor host.
export const authClient = createAuthClient({
  plugins: [adminClient(), twoFactorClient()],
});
