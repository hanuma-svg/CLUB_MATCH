"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { ClubCard, type ClubCardData } from "@/components/clubs/ClubCard";
import { useToast } from "@/components/layout/ToastProvider";

export default function SavedClubsPage() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [clubs, setClubs] = useState<ClubCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students/bookmarks");
      if (res.ok) {
        const data = await res.json();
        setClubs((data.bookmarks || []).map((b: { club: ClubCardData }) => b.club));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "STUDENT") {
      load();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [load, session?.user?.role, status]);

  async function toggleBookmark(clubId: string) {
    const res = await fetch("/api/students/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId }),
    });
    if (res.ok) {
      showToast({ type: "info", title: "Removed from Saved Clubs" });
      await load();
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "STUDENT") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Student Sign-In Required</h1>
        <Link href="/login" className="mt-4 inline-block rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            Saved Clubs
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Communities you&apos;ve bookmarked for quick access.
          </p>
        </div>
        <Link href="/clubs" className="text-xs font-semibold text-indigo-600 hover:underline">
          Explore Directory →
        </Link>
      </div>

      {clubs.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 dark:border-slate-700">
          No saved clubs yet.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <ClubCard key={c.clubId} club={c} bookmarked onToggleBookmark={toggleBookmark} />
          ))}
        </div>
      )}
    </div>
  );
}
