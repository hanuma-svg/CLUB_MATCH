import React from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Users, ArrowRight } from "lucide-react";

export interface EventCardData {
  eventId: string;
  slug: string;
  title: string;
  description: string;
  eventDate: string | Date;
  startTime: string;
  endTime: string;
  venue: string;
  maxCapacity: number;
  currentRegistrations: number;
  status: string;
  isSampleEvent?: boolean;
  similarityScore?: number | null;
  clubId?: string;
  clubName?: string;
  clubSlug?: string;
  club?: { clubId: string; name: string; slug: string };
  category?: { name: string } | null;
  categoryName?: string;
}

export function EventCard({ event }: { event: EventCardData }) {
  const dateObj = new Date(event.eventDate);
  const formattedDate = dateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const seatsLeft = Math.max(0, event.maxCapacity - event.currentRegistrations);
  const fillPct = Math.min(100, Math.round((event.currentRegistrations / event.maxCapacity) * 100));
  const categoryLabel = event.category?.name || event.categoryName || "Event";

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-[#11131c] dark:hover:border-slate-700 transition-colors">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {categoryLabel}
          </span>
          <div className="flex items-center gap-1.5">
            {event.isSampleEvent && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Sample
              </span>
            )}
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium font-mono ${
                event.status === "CANCELLED"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  : seatsLeft === 0
                    ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {event.status === "CANCELLED"
                ? "Cancelled"
                : seatsLeft === 0
                  ? "Full"
                  : `${seatsLeft} seats left`}
            </span>
          </div>
        </div>

        <Link href={`/events/${event.slug}`} className="mt-3 block">
          <h3 className="font-display text-base font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            {event.title}
          </h3>
        </Link>

        <Link
          href={`/clubs/${event.club?.slug || event.clubSlug || ""}`}
          className="mt-1 inline-block text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {event.club?.name || event.clubName || "Campus Club"}
        </Link>

        {event.similarityScore !== null && event.similarityScore !== undefined && (
          <div className="mt-2 inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-xs font-mono font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {(event.similarityScore * 100).toFixed(0)}% match
          </div>
        )}

        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        <div className="mt-3.5 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{formattedDate}</span>
            <Clock className="ml-2 h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              {event.startTime} – {event.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800/80">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="font-mono">
              {event.currentRegistrations}/{event.maxCapacity}
            </span>
          </span>
          <span className="font-mono text-[11px]">{fillPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Link
            href={`/events/${event.slug}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Details &amp; Register
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
