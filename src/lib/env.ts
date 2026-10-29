import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PUBLIC_HOST: z.string().min(1),
  CMS_HOST: z.string().min(1),
  PUBLIC_ORIGIN: z.url(),
  CMS_ORIGIN: z.url(),
  AUTH_SECRET: z.string().min(32),
  UPLOAD_DIR: z.string().min(1).default("./uploads"),
  // "true" lets search engines index the public site. Anything else keeps it hidden from them.
  SITE_INDEXABLE: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export const isIndexable = () => getEnv().SITE_INDEXABLE === "true";

let cached: Env | undefined;

// Parsed on first use, not at import, so `next build` works without secrets present.
export function getEnv(): Env {
  if (!cached) {
    const result = schema.safeParse(process.env);
    if (!result.success) {
      const bad = result.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Invalid or missing environment variables: ${bad}. See .env.example.`);
    }
    cached = result.data;
  }
  return cached;
}
