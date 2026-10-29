import { requireUser } from "@/lib/session";
import { AccountPanel } from "./account-panel";

export const metadata = { title: "Akun | MMI Editor" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <main className="c-gate">
      <div className="box">
        <AccountPanel user={user} />
      </div>
    </main>
  );
}
