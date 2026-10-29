import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk | MMI Editor" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="c-gate">
      <div className="box">
        <div className="brandrow">
          <img src="/static/logo-mark.png" alt="" style={{ height: 30, width: "auto" }} />
          <b>MMI Editor</b>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
