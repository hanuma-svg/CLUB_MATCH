import React from "react";
import Link from "next/link";
import { ClubMatchLogo } from "@/components/layout/Logo";
import { Database, Sparkles, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a0b10]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <ClubMatchLogo className="h-7 w-7" />
              <span className="font-display text-base font-semibold text-slate-900 dark:text-white">
                ClubMatch
              </span>
            </Link>
            <p className="mt-2.5 max-w-md text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Smart college club and event recommendation platform for PES University EC Campus,
              built with PostgreSQL, Prisma ORM, and pgvector cosine similarity.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] dark:border-slate-800">
                <Database className="h-3 w-3 text-slate-500" />
                PostgreSQL + pgvector
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] dark:border-slate-800">
                <ShieldCheck className="h-3 w-3 text-slate-500" />
                ACID Transactions
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
              Discover
            </h3>
            <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/clubs" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Club Directory
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Upcoming Events
                </Link>
              </li>
              <li>
                <Link href="/onboarding" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Interest Onboarding
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Recommendation Engine
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
              Portals
            </h3>
            <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/dashboard/student" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Student Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/coordinator" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Coordinator Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard/admin" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Admin Console
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200/80 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>
            ClubMatch · DBMS Level 3 Mini-Project. PES University EC Campus clubs referenced from directory.
          </p>
          <p>© {new Date().getFullYear()} ClubMatch</p>
        </div>
      </div>
    </footer>
  );
}
