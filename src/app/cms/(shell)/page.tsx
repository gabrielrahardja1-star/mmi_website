import { ROLE_LABEL } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export const metadata = { title: "MMI Editor" };

// Placeholder until the visual editor is built: confirms the login works and who is signed in.
export default async function EditorHome() {
  const user = await requireUser();
  return (
    <main className="c-gate">
      <div className="box">
        <h1>Halo, {user.name}</h1>
        <p className="muted">
          Masuk sebagai {user.email} ({ROLE_LABEL[user.role]}). Editor visual sedang dibangun.
        </p>
        <div className="row">
          <a className="c-btn ghost sm" href="/akun">
            Akun dan keamanan
          </a>
        </div>
      </div>
    </main>
  );
}
