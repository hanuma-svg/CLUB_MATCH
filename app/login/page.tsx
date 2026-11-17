"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Lock, Mail, Loader2, ArrowRight, Shield } from "lucide-react";
import { ClubMatchLogo } from "@/components/layout/Logo";
import { useToast } from "@/components/layout/ToastProvider";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password, or account is inactive.");
        showToast({ type: "error", title: "Sign in failed", message: "Check your credentials." });
        setLoading(false);
        return;
      }

      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role;

      showToast({ type: "success", title: "Welcome back to ClubMatch!" });
      if (role === "ADMIN") router.push("/dashboard/admin");
      else if (role === "CLUB_COORDINATOR") router.push("/dashboard/coordinator");
      else router.push("/dashboard/student");
      router.refresh();
    } catch {
      setError("Network error while signing in.");
      setLoading(false);
    }
  }

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-[#11121d]">
        <div className="flex flex-col items-center text-center">
          <ClubMatchLogo className="h-12 w-12" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
            Sign in to ClubMatch
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Access your personalized clubs, events, and dashboard.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Email Address
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@pes.edu"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Password
            </label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign In
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Seeded Demo Quick Fill */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Seeded Demo Accounts (Quick Fill)
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemo("student@clubmatch.pes.edu", "Student@ClubMatch2026!")}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => fillDemo("coordinator@clubmatch.pes.edu", "Coord@ClubMatch2026!")}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Coordinator
            </button>
            <button
              type="button"
              onClick={() => fillDemo("admin@clubmatch.pes.edu", "Admin@ClubMatch2026!")}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Admin
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          New to PESU EC Campus?{" "}
          <Link href="/register" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Create Student Account
          </Link>
        </p>
      </div>
    </div>
  );
}
