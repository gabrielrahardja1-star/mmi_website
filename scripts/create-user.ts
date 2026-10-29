// Creates an editor account, or resets the password of an existing one. Run on the server (or locally):
//
//   npm run user:create -- --email ani@example.com --name "Ani" --role editor
//   npm run user:create -- --email ani@example.com --reset-password
//
// The password is typed at a hidden prompt, so it never lands in shell history. For automation, set
// MMI_NEW_PASSWORD instead. Roles: admin, editor, contributor (see src/lib/roles.ts).
import { createInterface } from "node:readline";
import { getAuth } from "../src/lib/auth";
import { isRole, ROLES } from "../src/lib/roles";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Swallow the echo of typed characters, but still print the prompt itself.
    const rlAny = rl as unknown as { _writeToOutput: (s: string) => void };
    const original = rlAny._writeToOutput.bind(rl);
    let prompted = false;
    rlAny._writeToOutput = (s: string) => {
      if (!prompted) {
        prompted = true;
        original(s);
      }
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function readPassword(): Promise<string> {
  const fromEnv = process.env.MMI_NEW_PASSWORD;
  if (fromEnv) return fromEnv;
  if (!process.stdin.isTTY) fail("no terminal for the password prompt. Set MMI_NEW_PASSWORD instead.");
  const a = await askHidden("Password (min 12 characters): ");
  const b = await askHidden("Repeat password: ");
  if (a !== b) fail("the two passwords do not match.");
  return a;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) fail("--email is required and must be a valid email address.");

  const ctx = await getAuth().$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);

  if (flag("reset-password")) {
    if (!existing) fail(`no user with email ${email}.`);
    const password = await readPassword();
    if (password.length < ctx.password.config.minPasswordLength) {
      fail(`password must be at least ${ctx.password.config.minPasswordLength} characters.`);
    }
    await ctx.internalAdapter.updatePassword(existing.user.id, await ctx.password.hash(password));
    console.log(`Password reset for ${email}.`);
    return;
  }

  if (existing) fail(`${email} already exists. Use --reset-password to change the password.`);
  const name = arg("name")?.trim();
  if (!name) fail("--name is required.");
  const role = arg("role") ?? "contributor";
  if (!isRole(role)) fail(`--role must be one of: ${ROLES.join(", ")}.`);

  const password = await readPassword();
  if (password.length < ctx.password.config.minPasswordLength) {
    fail(`password must be at least ${ctx.password.config.minPasswordLength} characters.`);
  }

  const user = await ctx.internalAdapter.createUser({ email, name, role, emailVerified: true }, { method: "email-password" });
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  console.log(`Created ${role} ${email}. They can sign in at the editor now.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
