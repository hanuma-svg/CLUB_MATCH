"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Check, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/components/layout/ToastProvider";

interface InterestItem {
  interestId: string;
  name: string;
  slug: string;
  category: "TECHNOLOGY" | "CREATIVE" | "CULTURAL" | "OTHER";
  description?: string | null;
}

const CATEGORY_LABELS: Record<string, { title: string; badge: string }> = {
  TECHNOLOGY: { title: "Technology", badge: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300" },
  CREATIVE: { title: "Creative", badge: "text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300" },
  CULTURAL: { title: "Cultural", badge: "text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300" },
  OTHER: { title: "Leadership, Sports & Research", badge: "text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300" },
};

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [interests, setInterests] = useState<InterestItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/interests");
        const data = await res.json();
        setInterests(data.interests || []);

        if (session?.user?.role === "STUDENT") {
          const myRes = await fetch("/api/students/interests");
          if (myRes.ok) {
            const myData = await myRes.json();
            setSelected(new Set(myData.interestIds || []));
          }
        }
      } finally {
        setLoading(false);
      }
    }
    if (status !== "loading") {
      load();
    }
  }, [session?.user?.role, status]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function handleSave() {
    if (selected.size === 0) {
      showToast({ type: "error", title: "Pick at least 1 interest" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/students/interests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interestIds: Array.from(selected) }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast({ type: "error", title: "Could not save interests", message: data.error });
        setSaving(false);
        return;
      }

      showToast({
        type: "success",
        title: "Interests saved to PostgreSQL!",
        message: data.embeddingSync?.synced
          ? "Your pgvector interest vector was updated."
          : "Your recommendations are ready on your dashboard.",
      });
      router.push("/dashboard/student");
      router.refresh();
    } catch {
      showToast({ type: "error", title: "Network error saving interests" });
      setSaving(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Sign in as a Student to Save Your Interests
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Your selected interests are stored in PostgreSQL and used by our pgvector recommendation engine.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold dark:border-slate-700">
            Login
          </Link>
          <Link href="/register" className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white">
            Create Student Account
          </Link>
        </div>
      </div>
    );
  }

  if (session.user.role !== "STUDENT") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Interest Onboarding is for Student Accounts
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          You are currently signed in as <strong>{session.user.role}</strong>.
        </p>
        <Link
          href={session.user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/coordinator"}
          className="mt-6 inline-block rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white"
        >
          Go to Your Dashboard
        </Link>
      </div>
    );
  }

  const grouped = (["TECHNOLOGY", "CREATIVE", "CULTURAL", "OTHER"] as const).map((cat) => ({
    cat,
    meta: CATEGORY_LABELS[cat],
    items: interests.filter((i) => i.category === cat),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            Personalized Matching Setup
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-white">
            What are you passionate about?
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Select multiple interests below. You can update them anytime from your Student Dashboard.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            {selected.size} selected
          </span>
          <button
            onClick={handleSave}
            disabled={saving || selected.size === 0}
            className="inline-flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save &amp; View Matches
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-10">
        {grouped.map(({ cat, meta, items }) => (
          <section key={cat}>
            <div className="flex items-center gap-3 mb-4">
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${meta.badge}`}>
                {meta.title}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{items.length} options</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => {
                const isSelected = selected.has(item.interestId);
                return (
                  <button
                    key={item.interestId}
                    type="button"
                    onClick={() => toggle(item.interestId)}
                    className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/50"
                        : "border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-[#11121d] dark:hover:border-indigo-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </p>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
