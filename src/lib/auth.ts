import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { getDb } from "@/db";
import * as authSchema from "@/db/auth-schema";
import { getEnv } from "@/lib/env";

export const ROLES = ["admin", "editor", "contributor"] as const;
export type Role = (typeof ROLES)[number];

function createAuth() {
  const env = getEnv();
  return betterAuth({
    appName: "MMI Editor",
    baseURL: env.CMS_ORIGIN,
    secret: env.AUTH_SECRET,
    trustedOrigins: [env.CMS_ORIGIN],
    database: drizzleAdapter(getDb(), { provider: "pg", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      // Accounts are created by an admin (or scripts/create-user.ts), never by visitors.
      disableSignUp: true,
      minPasswordLength: 12,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 300, max: 5 },
      },
    },
    advanced: {
      cookiePrefix: "mmi-editor",
      useSecureCookies: process.env.NODE_ENV === "production",
      // The editor host sits behind Cloudflare, so the real client IP is in cf-connecting-ip.
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
    plugins: [
      admin({ defaultRole: "contributor", adminRoles: ["admin"] }),
      twoFactor({ issuer: "MMI Editor" }),
      nextCookies(),
    ],
  });
}

let cached: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return (cached ??= createAuth());
}
