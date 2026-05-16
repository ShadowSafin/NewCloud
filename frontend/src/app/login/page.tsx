"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { HardDrive } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      router.push("/");
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full border border-hairline flex items-center justify-center mx-auto mb-6">
            <HardDrive className="w-5 h-5 text-ink" />
          </div>
          <h1 className="text-xl text-ink tracking-tight">Welcome back</h1>
          <p className="text-sm text-body-mid mt-1">Sign in to your account</p>
        </div>

        {/* Form card */}
        <div className="bg-canvas-card border border-hairline rounded-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-sm bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs text-body-mid">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-xai text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs text-body-mid">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-xai text-sm"
                required
              />
            </div>
            <button type="submit" className="btn-pill-primary w-full h-10" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-sm text-body-mid text-center mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-ink hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
