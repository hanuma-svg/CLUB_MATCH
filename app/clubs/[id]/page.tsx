"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Calendar,
  FlaskConical,
  Loader2,
  Mail,
  MapPin,
  Sparkles,
  UserPlus,
  UserCheck,
  Users,
} from "lucide-react";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { ClubCard, type ClubCardData } from "@/components/clubs/ClubCard";
import { useToast } from "@/components/layout/ToastProvider";

interface ClubDetailResponse {
  club: {
    clubId: string;
    slug: string;
    name: string;
    category: string;
    campus: string;
    tagline: string | null;
    description: string;
    activities: string;
    isSampleDescription: boolean;
    verifiedCoordinatorName: string | null;
    verifiedEmail: string | null;
    verifiedSocialLinks: Record<string, string> | null;
    memberCount: number;
    interests: Array<{ interest: { interestId: string; name: string; slug: string } }>;
    events: Array<EventCardData>;
    _count: { bookmarks: number; memberships: number; events: number };
  };
  isBookmarked: boolean;
  isMember?: boolean;
  similarClubs: {
    mode: string;
    items: ClubCardData[];
  };
}

export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [data, setData] = useState<ClubDetailResponse | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/clubs/${encodeURIComponent(id)}`);
        if (!res.ok) {
          setError("Club not found");
          setLoading(false);
          return;
        }
        const json = (await res.json()) as ClubDetailResponse;
        setData(json);
        setBookmarked(json.isBookmarked);
        setIsMember(Boolean(json.isMember));
        setMemberCount(json.club.memberCount);
      } catch {
        setError("Failed to load club details");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function toggleMembership() {
    if (!data) return;
    if (session?.user?.role !== "STUDENT") {
      showToast({ type: "info", title: "Sign in as a student to join clubs" });
      return;
    }

    const res = await fetch(`/api/clubs/${encodeURIComponent(data.club.clubId)}/membership`, {
      method: isMember ? "DELETE" : "POST",
    });
    const json = await res.json();
    if (res.ok) {
      setIsMember(json.isMember);
      setMemberCount(json.memberCount);
      showToast({ type: "success", title: json.message });
    } else {
      showToast({ type: "error", title: "Action failed", message: json.error });
    }
  }

  async function toggleBookmark() {
    if (!data) return;
    if (session?.user?.role !== "STUDENT") {
      showToast({ type: "info", title: "Sign in as a student to bookmark clubs" });
      return;
    }

    const res = await fetch("/api/students/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId: data.club.clubId }),
    });
    if (res.ok) {
      const json = await res.json();
      setBookmarked(json.bookmarked);
      showToast({
        type: "success",
        title: json.bookmarked ? "Added to Saved Clubs" : "Removed from Saved Clubs",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          {error || "Club not found"}
        </h1>
        <Link href="/clubs" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
          <ArrowLeft className="h-4 w-4" />
          Back to Club Directory
        </Link>
      </div>
    );
  }

  const { club, similarClubs } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/clubs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Directory
      </Link>

      {/* Hero Banner Card */}
      <div className="mt-4 rounded-xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-[#11131c]">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {club.category === "RESEARCH_CENTER" && <FlaskConical className="h-3.5 w-3.5" />}
                {club.category.replace(/_/g, " ")}
              </span>
              {club.isSampleDescription && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Initial Reference Data
                </span>
              )}
            </div>

            <h1 className="mt-3 font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
              {club.name}
            </h1>
            {club.tagline && (
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{club.tagline}</p>
            )}

            <div className="mt-3.5 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {club.campus}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono">{memberCount}</span> members
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono">{club.events.length}</span> events
              </span>
            </div>
          </div>

          <div className="flex flex-wrap shrink-0 gap-2">
            <button
              type="button"
              onClick={toggleMembership}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                isMember
                  ? "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  : "bg-indigo-600 text-white hover:bg-indigo-500"
              }`}
            >
              {isMember ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              {isMember ? "Joined Community" : "Join Community"}
            </button>

            <button
              type="button"
              onClick={toggleBookmark}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium transition-colors ${
                bookmarked
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                  : "bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`} />
              {bookmarked ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-3 border-t border-slate-100 pt-7 dark:border-slate-800">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                About this {club.category === "RESEARCH_CENTER" ? "Research Center" : "Club"}
              </h2>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {club.description}
              </p>
            </div>

            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Key Activities
              </h2>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {club.activities}
              </p>
            </div>

            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Areas of Interest
              </h2>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {club.interests.map((ci) => (
                  <Link
                    key={ci.interest.interestId}
                    href={`/clubs?interest=${encodeURIComponent(ci.interest.slug)}`}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    {ci.interest.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                Coordinator &amp; Contact
              </h3>
              {club.verifiedCoordinatorName || club.verifiedEmail ? (
                <div className="mt-3 space-y-2 text-sm">
                  {club.verifiedCoordinatorName && (
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {club.verifiedCoordinatorName}
                    </p>
                  )}
                  {club.verifiedEmail && (
                    <p className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Mail className="h-4 w-4 text-indigo-500" />
                      {club.verifiedEmail}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Official coordinator contact details and social links are not yet verified in the
                  platform database. Administrators can update verified details from the Admin Console.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events by this Club */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Club Events
        </h2>
        {club.events.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {club.events.map((ev) => (
              <EventCard
                key={ev.eventId}
                event={{
                  ...ev,
                  club: { clubId: club.clubId, name: club.name, slug: club.slug },
                }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
            No scheduled events posted by this club yet.
          </div>
        )}
      </section>

      {/* Similar Communities */}
      {similarClubs.items.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Similar Communities
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {similarClubs.mode === "pgvector_cosine"
                  ? "Ranked using pgvector cosine similarity"
                  : "Matched by shared category and overlapping interests"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              {similarClubs.mode === "pgvector_cosine" ? "pgvector" : "Interest Overlap"}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similarClubs.items.map((sim) => (
              <ClubCard
                key={sim.clubId}
                club={{
                  ...sim,
                  campus: club.campus,
                  description: sim.tagline || "",
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
