"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { HardDrive } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError("");

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters");
      return;
    }

    try {
      await register(username, email, password);
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
          <h1 className="text-xl text-ink tracking-tight">Create account</h1>
          <p className="text-sm text-body-mid mt-1">Start using your personal cloud</p>
        </div>

        {/* Form card */}
        <div className="bg-canvas-card border border-hairline rounded-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || validationError) && (
              <div className="px-3 py-2 rounded-sm bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {error || validationError}
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs text-body-mid">Username</label>
              <input
                id="username"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-xai text-sm"
                required
                minLength={3}
                maxLength={30}
              />
            </div>
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
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-xai text-sm"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs text-body-mid">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-xai text-sm"
                required
              />
            </div>
            <button type="submit" className="btn-pill-primary w-full h-10" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-sm text-body-mid text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-ink hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
