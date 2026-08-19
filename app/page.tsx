import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="landing">
      <div className="landing-card">
        <div className="brand-mark">TT</div>
        <h1>Tournament Tracker</h1>
        <p>Track expenses and earnings across your card game trips and tournaments.</p>
        <AuthForm />
      </div>
    </div>
  );
}
