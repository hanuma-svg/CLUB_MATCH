"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BrainCircuit, Calendar, Info, Loader2, Search, X } from "lucide-react";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { useToast } from "@/components/layout/ToastProvider";

interface CategoryOption {
  categoryId: string;
  name: string;
  slug: string;
}

interface ClubOption {
  clubId: string;
  name: string;
}

export default function EventsDirectoryPage() {
  const { showToast } = useToast();

  const [events, setEvents] = useState<EventCardData[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);

  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic">("keyword");
  const [category, setCategory] = useState("ALL");
  const [clubId, setClubId] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [statusFilter, setStatusFilter] = useState("UPCOMING");

  const [loading, setLoading] = useState(true);
  const [semanticNotice, setSemanticNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((d) => setClubs((d.clubs || []).map((c: ClubOption) => ({ clubId: c.clubId, name: c.name }))))
      .catch(() => null);
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setSemanticNotice(null);

    try {
      if (searchMode === "semantic" && query.trim()) {
        const res = await fetch(`/api/search/semantic?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (!data.semanticAvailable) {
          setSemanticNotice(
            data.error ||
              "pgvector semantic search requires an embedding API key. Showing keyword matches instead."
          );
        } else {
          setEvents(data.events || []);
          setLoading(false);
          return;
        }
      }

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category !== "ALL") params.set("category", category);
      if (clubId !== "ALL") params.set("clubId", clubId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      setEvents(data.events || []);
      if (data.categories?.length) setCategories(data.categories);
    } catch {
      showToast({ type: "error", title: "Failed to load events" });
    } finally {
      setLoading(false);
    }
  }, [category, clubId, dateFrom, query, searchMode, showToast, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchEvents, 200);
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Campus Events &amp; Workshops
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
            Discover Events
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
            Real-time capacity tracking with atomic PostgreSQL seat reservations.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-[#11121d]">
          <button
            type="button"
            onClick={() => setSearchMode("keyword")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              searchMode === "keyword"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Keyword
          </button>
          <button
            type="button"
            onClick={() => setSearchMode("semantic")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              searchMode === "semantic"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            Semantic (pgvector)
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-12 dark:border-slate-800 dark:bg-[#11121d]">
        <div className="relative md:col-span-4">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, venues, or topics..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-3 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="md:col-span-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.categoryId} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">All Clubs</option>
            {clubs.map((c) => (
              <option key={c.clubId} value={c.clubId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="UPCOMING">Upcoming</option>
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {semanticNotice && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>{semanticNotice}</div>
        </div>
      )}

      {loading ? (
        <div className="mt-12 flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-2 text-sm">Loading campus events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
            No matching events found
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("ALL");
              setClubId("ALL");
              setDateFrom("");
              setStatusFilter("ALL");
            }}
            className="mt-4 rounded-xl gradient-brand px-4 py-2 text-xs font-semibold text-white"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <EventCard key={ev.eventId} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
