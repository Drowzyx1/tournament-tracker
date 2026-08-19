"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

export default function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Could not create account");
        }
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        throw new Error("Incorrect email or password");
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "signin" ? "active" : ""}
          onClick={() => switchMode("signin")}
        >
          Sign In
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : ""}
          onClick={() => switchMode("signup")}
        >
          Create Account
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <div className="field">
            <label>Name</label>
            <input
              type="text"
              value={name}
              placeholder="Your name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            required
            value={password}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            onChange={(e) => setPassword(e.target.value)}
            {...(mode === "signup" ? { minLength: 8 } : {})}
          />
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn-auth-submit" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
        </button>
      </form>
    </>
  );
}
