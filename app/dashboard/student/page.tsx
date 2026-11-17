"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Bookmark,
  BrainCircuit,
  CalendarCheck,
  Compass,
  Edit3,
  Loader2,
  RefreshCw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { ClubCard, type ClubCardData } from "@/components/clubs/ClubCard";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { useToast } from "@/components/layout/ToastProvider";

interface StudentDashboardData {
  student: {
    studentId: string;
    email: string;
    srn: string | null;
    department: string | null;
    semester: number | null;
    campus: string;
    bio: string | null;
    onboardingCompleted: boolean;
    user: { fullName: string; email: string };
    interests: Array<{ interest: { interestId: string; name: string; slug: string; category: string } }>;
  };
  bookmarks: ClubCardData[];
  memberships?: Array<{
    joinedAt: string;
    role: string;
    club: ClubCardData;
  }>;
  registrations: Array<{
    registrationId: string;
    status: string;
    registeredAt: string;
    event: EventCardData;
  }>;
  recommendedClubs: {
    mode: "pgvector_cosine" | "interest_overlap_fallback";
    semanticAvailable: boolean;
    embeddingProvider: string | null;
    embeddingModel: string | null;
    notice?: string;
    items: ClubCardData[];
  };
  recommendedEvents: {
    mode: "pgvector_cosine" | "interest_overlap_fallback";
    semanticAvailable: boolean;
    notice?: string;
    items: Array<EventCardData & { clubName: string; clubSlug: string }>;
  };
}

export default function StudentDashboardPage() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();

  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    srn: "",
    department: "",
    semester: "4",
    bio: "",
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students/dashboard");
      if (res.ok) {
        const json = (await res.json()) as StudentDashboardData;
        setData(json);
        setProfileForm({
          fullName: json.student.user.fullName || "",
          srn: json.student.srn || "",
          department: json.student.department || "CSE",
          semester: String(json.student.semester || 4),
          bio: json.student.bio || "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "STUDENT") {
      loadDashboard();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [loadDashboard, session?.user?.role, status]);

  async function handleRefreshRecommendations() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/recommendations", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        showToast({
          type: json.syncResult?.synced ? "success" : "info",
          title: json.syncResult?.synced
            ? "pgvector recommendations refreshed!"
            : "Recommendations refreshed",
          message: json.syncResult?.synced
            ? `Embedded via ${json.embeddingStatus?.model}`
            : json.syncResult?.reason,
        });
        await loadDashboard();
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/students/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: profileForm.fullName,
        srn: profileForm.srn || null,
        department: profileForm.department || null,
        semester: Number(profileForm.semester),
        bio: profileForm.bio || null,
      }),
    });
    if (res.ok) {
      showToast({ type: "success", title: "Profile updated" });
      setEditingProfile(false);
      await loadDashboard();
    } else {
      showToast({ type: "error", title: "Could not update profile" });
    }
  }

  async function handleToggleBookmark(clubId: string) {
    const res = await fetch("/api/students/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId }),
    });
    if (res.ok) {
      await loadDashboard();
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "STUDENT" || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Student Dashboard Access Required
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Please sign in with a Student account to view your personalized clubs and events.
        </p>
        <Link href="/login" className="mt-6 inline-block rounded-xl gradient-brand px-6 py-2.5 text-sm font-semibold text-white">
          Go to Login
        </Link>
      </div>
    );
  }

  const { student, bookmarks, memberships = [], registrations, recommendedClubs, recommendedEvents } = data;
  const bookmarkedIds = new Set(bookmarks.map((b) => b.clubId));
  const activeRegistrations = registrations.filter((r) => r.status === "REGISTERED");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      {/* Welcome & Profile Summary */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card dark:border-slate-800 dark:bg-[#11121d]">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <UserCheck className="h-3.5 w-3.5" />
              Student Portal · {student.campus}
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-white">
              Welcome back, {student.user.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {student.srn ? `SRN: ${student.srn} · ` : ""}
              {student.department || "Department unset"} · Semester {student.semester || "—"} ·{" "}
              {student.email}
            </p>
            {student.bio && (
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{student.bio}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setEditingProfile((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Profile
            </button>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
            >
              <Compass className="h-3.5 w-3.5" />
              Update Interests
            </Link>
            <button
              type="button"
              onClick={handleRefreshRecommendations}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl gradient-brand px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Matches
            </button>
          </div>
        </div>

        {/* Inline Edit Profile Form */}
        {editingProfile && (
          <form onSubmit={handleSaveProfile} className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-4 dark:border-slate-800">
            <input
              type="text"
              required
              value={profileForm.fullName}
              onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
              placeholder="Full Name"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              type="text"
              value={profileForm.srn}
              onChange={(e) => setProfileForm({ ...profileForm, srn: e.target.value })}
              placeholder="SRN"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              type="text"
              value={profileForm.department}
              onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
              placeholder="Department"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              value={profileForm.semester}
              onChange={(e) => setProfileForm({ ...profileForm, semester: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Sem {s}</option>
              ))}
            </select>
            <input
              type="text"
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              placeholder="Short bio about your campus interests..."
              className="sm:col-span-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button type="submit" className="rounded-xl gradient-brand px-4 py-2 text-xs font-semibold text-white">
              Save Profile
            </button>
          </form>
        )}

        {/* Selected Interests */}
        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Selected Interests ({student.interests.length})
            </p>
            <Link href="/onboarding" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              Edit Interests
            </Link>
          </div>
          {student.interests.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {student.interests.map((si) => (
                <Link
                  key={si.interest.interestId}
                  href={`/clubs?interest=${encodeURIComponent(si.interest.slug)}`}
                  className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  {si.interest.name}
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-indigo-300 p-4 text-sm text-slate-600 dark:border-indigo-800 dark:text-slate-400">
              You haven&apos;t selected any interests yet.{" "}
              <Link href="/onboarding" className="font-semibold text-indigo-600 underline">
                Pick your interests now
              </Link>
              .
            </div>
          )}
        </div>
      </div>

      {/* Recommendation Engine Mode Banner */}
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 text-xs ${
          recommendedClubs.semanticAvailable
            ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        }`}
      >
        <BrainCircuit className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">
            {recommendedClubs.semanticAvailable
              ? `Semantic Recommendations Active (${recommendedClubs.embeddingProvider} · ${recommendedClubs.embeddingModel} · pgvector <=> cosine distance)`
              : "Interest-Overlap Fallback Active (Semantic pgvector Embeddings Not Yet Configured)"}
          </p>
          {recommendedClubs.notice && <p className="mt-0.5 opacity-90">{recommendedClubs.notice}</p>}
        </div>
      </div>

      {/* Recommended Clubs */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Recommended Clubs for You
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Based on your interests &amp; community profiles
            </p>
          </div>
          <Link href="/clubs" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Explore More Clubs →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recommendedClubs.items.map((club) => (
            <ClubCard
              key={club.clubId}
              club={club}
              bookmarked={bookmarkedIds.has(club.clubId)}
              onToggleBookmark={handleToggleBookmark}
            />
          ))}
        </div>
      </section>

      {/* Recommended Events */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Events You Might Like
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized upcoming workshops, hackathons, and fests
            </p>
          </div>
          <Link href="/events" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Browse All Events →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recommendedEvents.items.map((ev) => (
            <EventCard key={ev.eventId} event={ev} />
          ))}
        </div>
      </section>

      {/* Saved Clubs, Joined Communities & Upcoming Registrations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-purple-600" />
              Joined Clubs ({memberships.length})
            </h3>
            <Link href="/clubs" className="text-xs font-semibold text-indigo-600 hover:underline">
              Explore
            </Link>
          </div>
          {memberships.length === 0 ? (
            <p className="text-sm text-slate-500">You haven&apos;t joined a community yet. Open any club to join!</p>
          ) : (
            <div className="space-y-3">
              {memberships.slice(0, 4).map((m) => (
                <Link
                  key={m.club.clubId}
                  href={`/clubs/${m.club.slug}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{m.club.name}</p>
                    <p className="text-xs text-slate-500">{m.role} · {m.club.category.replace(/_/g, " ")}</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">Open →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-indigo-600" />
              Saved Clubs ({bookmarks.length})
            </h3>
            <Link href="/saved-clubs" className="text-xs font-semibold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>
          {bookmarks.length === 0 ? (
            <p className="text-sm text-slate-500">No bookmarked clubs yet. Bookmark clubs from the directory!</p>
          ) : (
            <div className="space-y-3">
              {bookmarks.slice(0, 4).map((b) => (
                <Link
                  key={b.clubId}
                  href={`/clubs/${b.slug}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</p>
                    <p className="text-xs text-slate-500">{b.category.replace(/_/g, " ")}</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">Open →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
              Active Event Registrations ({activeRegistrations.length})
            </h3>
            <Link href="/my-registrations" className="text-xs font-semibold text-indigo-600 hover:underline">
              Full History
            </Link>
          </div>
          {activeRegistrations.length === 0 ? (
            <p className="text-sm text-slate-500">You have no upcoming event registrations yet.</p>
          ) : (
            <div className="space-y-3">
              {activeRegistrations.slice(0, 4).map((r) => (
                <Link
                  key={r.registrationId}
                  href={`/events/${r.event.slug}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{r.event.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(r.event.eventDate).toLocaleDateString("en-IN")} · {r.event.venue}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {r.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
