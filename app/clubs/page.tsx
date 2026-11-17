"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrainCircuit, Filter, Info, Loader2, Search, X } from "lucide-react";
import { ClubCard, type ClubCardData } from "@/components/clubs/ClubCard";
import { useToast } from "@/components/layout/ToastProvider";

interface InterestOption {
  interestId: string;
  name: string;
  slug: string;
}

const CATEGORY_TABS = [
  { value: "ALL", label: "All Communities" },
  { value: "TECHNICAL", label: "Technical Clubs" },
  { value: "NON_TECHNICAL", label: "Non-Technical Clubs" },
  { value: "CULTURAL", label: "Cultural Clubs" },
  { value: "RESEARCH_CENTER", label: "Research Centers" },
];

function ClubsDirectoryContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [clubs, setClubs] = useState<ClubCardData[]>([]);
  const [interests, setInterests] = useState<InterestOption[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic">("keyword");
  const [category, setCategory] = useState(searchParams.get("category") || "ALL");
  const [interest, setInterest] = useState(searchParams.get("interest") || "");
  const [campus, setCampus] = useState("ALL");
  const [sort, setSort] = useState(searchParams.get("sort") || "featured");

  const [loading, setLoading] = useState(true);
  const [semanticNotice, setSemanticNotice] = useState<string | null>(null);

  const loadInterests = useCallback(async () => {
    const res = await fetch("/api/interests");
    if (res.ok) {
      const data = await res.json();
      setInterests(data.interests || []);
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    if (session?.user?.role !== "STUDENT") return;
    const res = await fetch("/api/students/bookmarks");
    if (res.ok) {
      const data = await res.json();
      setBookmarkedIds(new Set((data.bookmarks || []).map((b: { club: { clubId: string } }) => b.club.clubId)));
    }
  }, [session?.user?.role]);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    setSemanticNotice(null);

    try {
      if (searchMode === "semantic" && query.trim()) {
        const res = await fetch(`/api/search/semantic?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (!data.semanticAvailable) {
          setSemanticNotice(
            data.error ||
              "pgvector semantic search requires an embedding API key (GEMINI_API_KEY, OPENAI_API_KEY, or Ollama). Showing keyword results instead."
          );
        } else {
          setClubs(data.clubs || []);
          setLoading(false);
          return;
        }
      }

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category !== "ALL") params.set("category", category);
      if (interest) params.set("interest", interest);
      if (campus !== "ALL") params.set("campus", campus);
      if (sort) params.set("sort", sort);

      const res = await fetch(`/api/clubs?${params.toString()}`);
      const data = await res.json();
      setClubs(data.clubs || []);
    } catch {
      showToast({ type: "error", title: "Failed to load clubs" });
    } finally {
      setLoading(false);
    }
  }, [campus, category, interest, query, searchMode, showToast, sort]);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClubs();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchClubs]);

  const handleToggleBookmark = async (clubId: string) => {
    if (session?.user?.role !== "STUDENT") {
      showToast({ type: "info", title: "Sign in as a student to bookmark clubs" });
      return;
    }

    const res = await fetch("/api/students/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId }),
    });

    if (res.ok) {
      const data = await res.json();
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (data.bookmarked) next.add(clubId);
        else next.delete(clubId);
        return next;
      });
      showToast({
        type: "success",
        title: data.bookmarked ? "Club bookmarked" : "Bookmark removed",
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            PES University EC Campus Directory
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
            Explore Clubs &amp; Research Centers
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
            Club directory for PES University EC Campus. Unverified descriptions are marked as sample demo content.
          </p>
        </div>

        {/* Search Mode Switch */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-[#11131c]">
          <button
            type="button"
            onClick={() => setSearchMode("keyword")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              searchMode === "keyword"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            Semantic (pgvector)
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setCategory(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              category === tab.value
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#11131c] dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Controls */}
      <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-12 dark:border-slate-800 dark:bg-[#11121d]">
        <div className="relative md:col-span-5">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              searchMode === "semantic"
                ? "Describe what you want (e.g. 'neural networks and NLP research')..."
                : "Search clubs, activities, or technologies..."
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="md:col-span-3">
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">All Interests</option>
              {interests.map((i) => (
                <option key={i.interestId} value={i.slug}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <select
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">All Campuses</option>
            <option value="PES University EC Campus">PESU EC Campus</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="featured">Sort: Featured</option>
            <option value="popular">Sort: Most Popular</option>
            <option value="name">Sort: A – Z</option>
          </select>
        </div>
      </div>

      {/* Semantic Status Notice */}
      {semanticNotice && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <strong>Semantic Search Notice:</strong> {semanticNotice}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="mt-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Showing <strong className="font-mono">{clubs.length}</strong> communities
        </span>
        {searchMode === "semantic" && !semanticNotice && query.trim() && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <BrainCircuit className="h-3.5 w-3.5" />
            Ranked by pgvector cosine similarity
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-12 flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="mt-2 text-xs">Querying PostgreSQL directory...</p>
        </div>
      ) : clubs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-800">
          <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
            No matching clubs found
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search terms or clearing active filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("ALL");
              setInterest("");
            }}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <ClubCard
              key={club.clubId}
              club={club}
              bookmarked={bookmarkedIds.has(club.clubId)}
              onToggleBookmark={session?.user?.role === "STUDENT" ? handleToggleBookmark : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClubsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ClubsDirectoryContent />
    </Suspense>
  );
}
