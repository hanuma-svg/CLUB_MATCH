"use client";

import React from "react";
import Link from "next/link";
import { Bookmark, FlaskConical, Users, ArrowRight } from "lucide-react";

export interface ClubCardData {
  clubId: string;
  slug: string;
  name: string;
  category: string;
  campus: string;
  tagline?: string | null;
  description: string;
  isSampleDescription: boolean;
  memberCount: number;
  isFeatured?: boolean;
  similarityScore?: number | null;
  matchedInterests?: string[];
  interests?: Array<{ interest: { interestId: string; name: string } }>;
  _count?: { events?: number; bookmarks?: number };
}

const CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: "Technical",
  NON_TECHNICAL: "Non-Technical",
  CULTURAL: "Cultural",
  RESEARCH_CENTER: "Research Center",
};

export function ClubCard({
  club,
  bookmarked,
  onToggleBookmark,
}: {
  club: ClubCardData;
  bookmarked?: boolean;
  onToggleBookmark?: (clubId: string) => void;
}) {
  const categoryLabel = CATEGORY_LABELS[club.category] || "Club";
  const initials = club.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const interestNames =
    club.matchedInterests?.length
      ? club.matchedInterests
      : club.interests?.map((i) => i.interest.name) || [];

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-[#11131c] dark:hover:border-slate-700 transition-colors">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold">
              {club.category === "RESEARCH_CENTER" ? (
                <FlaskConical className="h-4 w-4" />
              ) : (
                initials
              )}
            </div>
            <div>
              <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {categoryLabel}
              </span>
              {club.isSampleDescription && (
                <span className="ml-1.5 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Sample
                </span>
              )}
            </div>
          </div>

          {onToggleBookmark && (
            <button
              type="button"
              onClick={() => onToggleBookmark(club.clubId)}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark club"}
              className={`rounded-lg p-1.5 transition-colors ${
                bookmarked
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
            </button>
          )}
        </div>

        <Link href={`/clubs/${club.slug}`} className="mt-3.5 block">
          <h3 className="font-display text-base font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
            {club.name}
          </h3>
        </Link>

        {club.similarityScore !== null && club.similarityScore !== undefined && (
          <div className="mt-1.5 inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-xs font-mono font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {(club.similarityScore * 100).toFixed(0)}% match
          </div>
        )}

        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {club.tagline || club.description}
        </p>

        {interestNames.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {interestNames.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="font-mono">{club.memberCount}</span>
          </span>
          {club._count?.events !== undefined && (
            <span>{club._count.events} event{club._count.events === 1 ? "" : "s"}</span>
          )}
        </div>
        <Link
          href={`/clubs/${club.slug}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Explore
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
