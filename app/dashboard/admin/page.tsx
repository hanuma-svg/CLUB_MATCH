"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  BrainCircuit,
  Calendar,
  Check,
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Star,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/components/layout/ToastProvider";

type AdminTab = "overview" | "clubs" | "events" | "coordinators" | "users" | "interests" | "dbms";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();

  const [tab, setTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<{
    stats: Record<string, number>;
    embeddingStatus: { configured: boolean; provider: string | null; model: string | null; reason?: string };
    popularClubs: Array<{ clubId: string; name: string; category: string; memberCount: number; _count: { events: number; bookmarks: number } }>;
    popularEvents: Array<{ eventId: string; title: string; currentRegistrations: number; maxCapacity: number; club: { name: string } }>;
    pendingClubs: Array<{ clubId: string; name: string; category: string; description: string }>;
    recentActivities: Array<{ activityId: string; action: string; summary: string; actorRole: string; createdAt: string }>;
  } | null>(null);

  const [allClubs, setAllClubs] = useState<Array<{ clubId: string; name: string; category: string; status: string; isFeatured: boolean }>>([]);
  const [allEvents, setAllEvents] = useState<
    Array<{
      eventId: string;
      title: string;
      status: string;
      isFeatured: boolean;
      eventDate: string;
      venue: string;
      currentRegistrations: number;
      maxCapacity: number;
      club: { clubId: string; name: string };
      category: { categoryId: string; name: string };
    }>
  >([]);
  const [eventCategories, setEventCategories] = useState<Array<{ categoryId: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ userId: string; fullName: string; email: string; role: string; isActive: boolean }>>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [coordinators, setCoordinators] = useState<Array<{ coordinatorId: string; email: string; user: { fullName: string }; assignments: Array<{ club: { clubId: string; name: string } }> }>>([]);
  const [interests, setInterests] = useState<Array<{ interestId: string; name: string; category: string }>>([]);
  const [dbShowcase, setDbShowcase] = useState<{
    metadata?: { pgVersion: string; hasPgvector: boolean; viewCount: number; triggerCount: number; indexCount: number };
    popularClubsView?: Array<{ name: string; engagement_score: number; bookmark_count: number; total_events: number }>;
    eventStatsView?: Array<{ title: string; club_name: string; active_registrations: number; max_capacity: number; fill_percentage: string }>;
    clubEventSummaryView?: Array<{ club_name: string; category: string; total_events: number; total_event_registrations: number }>;
    studentSummaryView?: Array<{ full_name: string; srn: string | null; active_event_registrations: number; bookmarked_clubs: number; memberships: number }>;
    aboveAverageEventsSubquery?: Array<{ title: string; current_registrations: number; max_capacity: number; fill_pct: number }>;
  } | null>(null);

  const [newClub, setNewClub] = useState({
    name: "",
    category: "TECHNICAL",
    tagline: "",
    description: "",
    activities: "",
  });
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    clubId: "",
    categoryId: "",
    eventDate: "",
    registrationDeadline: "",
    startTime: "15:00",
    endTime: "17:00",
    venue: "EC Campus Seminar Hall 1",
    maxCapacity: "80",
  });
  const [newInterest, setNewInterest] = useState({ name: "", category: "TECHNOLOGY" });
  const [assignForm, setAssignForm] = useState({ coordinatorId: "", clubId: "" });
  const [syncingVec, setSyncingVec] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, clubsRes, eventsRes, usersRes, coordRes, intRes, dbRes] = await Promise.all([
        fetch("/api/admin/overview"),
        fetch("/api/clubs?allStatuses=true"),
        fetch("/api/events?status=ALL"),
        fetch("/api/admin/users"),
        fetch("/api/admin/coordinators"),
        fetch("/api/interests"),
        fetch("/api/admin/db-showcase"),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (clubsRes.ok) {
        const c = await clubsRes.json();
        const clubsList = c.clubs || [];
        setAllClubs(clubsList);
        if (clubsList.length > 0) {
          setNewEvent((prev) => ({ ...prev, clubId: prev.clubId || clubsList[0].clubId }));
        }
      }
      if (eventsRes.ok) {
        const ev = await eventsRes.json();
        setAllEvents(ev.events || []);
        const cats = ev.categories || [];
        setEventCategories(cats);
        if (cats.length > 0) {
          setNewEvent((prev) => ({ ...prev, categoryId: prev.categoryId || cats[0].categoryId }));
        }
      }
      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u.users || []);
      }
      if (coordRes.ok) {
        const co = await coordRes.json();
        setCoordinators(co.coordinators || []);
      }
      if (intRes.ok) {
        const i = await intRes.json();
        setInterests(i.interests || []);
      }
      if (dbRes.ok) setDbShowcase(await dbRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      loadAll();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [loadAll, session?.user?.role, status]);

  async function handleClubStatus(clubId: string, nextStatus: "ACTIVE" | "REJECTED" | "INACTIVE") {
    const res = await fetch(`/api/clubs/${encodeURIComponent(clubId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      showToast({ type: "success", title: `Club marked ${nextStatus}` });
      await loadAll();
    }
  }

  async function handleToggleClubFeatured(clubId: string, nextFeatured: boolean) {
    const res = await fetch(`/api/clubs/${encodeURIComponent(clubId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: nextFeatured }),
    });
    if (res.ok) {
      showToast({ type: "success", title: nextFeatured ? "Club featured on homepage" : "Removed featured flag" });
      await loadAll();
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newEvent,
        maxCapacity: Number(newEvent.maxCapacity),
        eventDate: new Date(newEvent.eventDate).toISOString(),
        registrationDeadline: new Date(newEvent.registrationDeadline).toISOString(),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast({ type: "error", title: "Failed to create event", message: json.error });
      return;
    }
    showToast({ type: "success", title: "Event created!" });
    setNewEvent((prev) => ({ ...prev, title: "", description: "" }));
    await loadAll();
  }

  async function handleToggleEventFeatured(eventId: string, nextFeatured: boolean) {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: nextFeatured }),
    });
    if (res.ok) {
      showToast({ type: "success", title: nextFeatured ? "Event featured" : "Event unfeatured" });
      await loadAll();
    }
  }

  async function handleCancelEvent(eventId: string) {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast({ type: "info", title: "Event cancelled" });
      await loadAll();
    }
  }

  async function handleUnassignCoordinator(coordinatorId: string, clubId: string) {
    const res = await fetch(
      `/api/admin/coordinators?coordinatorId=${encodeURIComponent(coordinatorId)}&clubId=${encodeURIComponent(clubId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      showToast({ type: "info", title: "Coordinator unassigned from club" });
      await loadAll();
    } else {
      showToast({ type: "error", title: "Failed to unassign coordinator" });
    }
  }

  async function handleCreateClub(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newClub, isSampleDescription: false }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast({ type: "error", title: "Failed to create club", message: json.error });
      return;
    }
    showToast({ type: "success", title: "Club created!" });
    setNewClub({ name: "", category: "TECHNICAL", tagline: "", description: "", activities: "" });
    await loadAll();
  }

  async function handleRoleChange(userId: string, role: string, isActive: boolean) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role, isActive }),
    });
    if (res.ok) {
      showToast({ type: "success", title: "User updated" });
      await loadAll();
    } else {
      showToast({ type: "error", title: "Failed to update user" });
    }
  }

  async function handleAssignCoordinator(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/coordinators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignForm),
    });
    if (res.ok) {
      showToast({ type: "success", title: "Coordinator assigned to club" });
      await loadAll();
    } else {
      const err = await res.json();
      showToast({ type: "error", title: "Assignment failed", message: err.error });
    }
  }

  async function handleCreateInterest(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newInterest),
    });
    if (res.ok) {
      showToast({ type: "success", title: "Interest added" });
      setNewInterest({ name: "", category: "TECHNOLOGY" });
      await loadAll();
    }
  }

  async function handleSyncEmbeddings() {
    setSyncingVec(true);
    try {
      const res = await fetch("/api/embeddings/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showToast({ type: "error", title: "Embedding sync unavailable", message: json.embeddingStatus?.reason || json.error });
        return;
      }
      showToast({
        type: "success",
        title: "pgvector Embeddings Synced!",
        message: `${json.clubsSynced} clubs, ${json.eventsSynced} events, ${json.studentsSynced} students`,
      });
      await loadAll();
    } finally {
      setSyncingVec(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN" || !overview) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Administrator Access Required</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This console is restricted to authorized ADMIN accounts.
        </p>
        <Link href="/login" className="mt-6 inline-block rounded-xl gradient-brand px-6 py-2.5 text-sm font-semibold text-white">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <Shield className="h-3.5 w-3.5" />
            Admin Control Plane · Full RBAC Governance
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">
            ClubMatch Admin Dashboard
          </h1>
        </div>

        <button
          type="button"
          onClick={handleSyncEmbeddings}
          disabled={syncingVec}
          className="inline-flex items-center gap-2 rounded-xl gradient-brand px-4 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${syncingVec ? "animate-spin" : ""}`} />
          Sync pgvector Embeddings
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Total Students", value: overview.stats.totalStudents },
          { label: "Total Clubs & Labs", value: overview.stats.totalClubs },
          { label: "Total Events", value: overview.stats.totalEvents },
          { label: "Active Registrations", value: overview.stats.totalRegistrations },
          {
            label: "pgvector Embedded",
            value: `${overview.stats.clubsWithEmbeddings}/${overview.stats.totalClubs}`,
          },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#11121d]">
            <p className="text-xs font-medium text-slate-500">{k.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {(
          [
            ["overview", "Overview & Approvals"],
            ["clubs", "Clubs Management"],
            ["events", "Events Management"],
            ["coordinators", "Coordinator Assignments"],
            ["users", "Users & Roles"],
            ["interests", "Interests"],
            ["dbms", "DBMS & pgvector Inspector"],
          ] as Array<[AdminTab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              tab === id
                ? "gradient-brand text-white"
                : "border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-8">
          {overview.pendingClubs.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-900/60 dark:bg-amber-950/30">
              <h2 className="font-display text-lg font-bold mb-3">
                Pending Club Submissions ({overview.pendingClubs.length})
              </h2>
              <div className="space-y-3">
                {overview.pendingClubs.map((c) => (
                  <div key={c.clubId} className="flex items-center justify-between rounded-xl bg-white p-4 dark:bg-slate-900">
                    <div>
                      <p className="font-bold text-sm">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.category} · {c.description.slice(0, 100)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleClubStatus(c.clubId, "ACTIVE")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClubStatus(c.clubId, "REJECTED")}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
              <h2 className="font-display text-lg font-bold mb-4">Most Popular Clubs</h2>
              <div className="space-y-2.5 text-sm">
                {overview.popularClubs.map((c) => (
                  <div key={c.clubId} className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.category}</p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600">
                      {c.memberCount} members · {c._count.bookmarks} bookmarks
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
              <h2 className="font-display text-lg font-bold mb-4">Most Popular Events</h2>
              <div className="space-y-2.5 text-sm">
                {overview.popularEvents.map((e) => (
                  <div key={e.eventId} className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <div>
                      <p className="font-semibold">{e.title}</p>
                      <p className="text-xs text-slate-500">{e.club.name}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">
                      {e.currentRegistrations}/{e.maxCapacity} seats
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
            <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-indigo-600" />
              Platform Activity &amp; Trigger Audit Log
            </h2>
            <div className="space-y-2 text-xs">
              {overview.recentActivities.map((a) => (
                <div key={a.activityId} className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span>
                    <strong className="text-indigo-600">[{a.action}]</strong> {a.summary}
                  </span>
                  <span className="text-slate-400">
                    {a.actorRole} · {new Date(a.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: CLUBS */}
      {tab === "clubs" && (
        <div className="space-y-6">
          <form onSubmit={handleCreateClub} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-[#11121d]">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              Add New Club or Research Center
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <input
                type="text"
                required
                value={newClub.name}
                onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                placeholder="Club Name"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <select
                value={newClub.category}
                onChange={(e) => setNewClub({ ...newClub, category: e.target.value })}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="TECHNICAL">Technical Club</option>
                <option value="NON_TECHNICAL">Non-Technical Club</option>
                <option value="CULTURAL">Cultural Club</option>
                <option value="RESEARCH_CENTER">Research Center</option>
              </select>
              <input
                type="text"
                value={newClub.tagline}
                onChange={(e) => setNewClub({ ...newClub, tagline: e.target.value })}
                placeholder="Short tagline"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <textarea
              rows={2}
              required
              value={newClub.description}
              onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
              placeholder="Description..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              type="text"
              required
              value={newClub.activities}
              onChange={(e) => setNewClub({ ...newClub, activities: e.target.value })}
              placeholder="Key activities..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button type="submit" className="rounded-xl gradient-brand px-5 py-2 text-xs font-semibold text-white">
              Create Active Club
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 overflow-x-auto dark:border-slate-800 dark:bg-[#11121d]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allClubs.map((c) => (
                  <tr key={c.clubId} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="py-2.5 pr-4 font-semibold">{c.name}</td>
                    <td className="py-2.5 pr-4">{c.category}</td>
                    <td className="py-2.5 pr-4">{c.status}</td>
                    <td className="py-2.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleClubFeatured(c.clubId, !c.isFeatured)}
                        className={`inline-flex items-center gap-1 font-semibold hover:underline ${
                          c.isFeatured ? "text-amber-600" : "text-slate-500"
                        }`}
                      >
                        <Star className="h-3 w-3" />
                        {c.isFeatured ? "Featured" : "Feature"}
                      </button>
                      {c.status !== "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => handleClubStatus(c.clubId, "ACTIVE")}
                          className="text-emerald-600 font-semibold hover:underline"
                        >
                          Activate
                        </button>
                      )}
                      {c.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => handleClubStatus(c.clubId, "INACTIVE")}
                          className="text-rose-600 font-semibold hover:underline"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: EVENTS */}
      {tab === "events" && (
        <div className="space-y-6">
          <form onSubmit={handleCreateEvent} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-[#11121d]">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              Schedule Campus Event
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <input
                type="text"
                required
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Event Title"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <select
                required
                value={newEvent.clubId}
                onChange={(e) => setNewEvent({ ...newEvent, clubId: e.target.value })}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {allClubs.map((c) => (
                  <option key={c.clubId} value={c.clubId}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                required
                value={newEvent.categoryId}
                onChange={(e) => setNewEvent({ ...newEvent, categoryId: e.target.value })}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {eventCategories.map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Event Date &amp; Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newEvent.eventDate}
                  onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Registration Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={newEvent.registrationDeadline}
                  onChange={(e) => setNewEvent({ ...newEvent, registrationDeadline: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <input
                type="text"
                required
                value={newEvent.venue}
                onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                placeholder="Venue"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <input
                type="text"
                required
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                placeholder="Start (e.g. 15:00)"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                type="text"
                required
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                placeholder="End (e.g. 17:00)"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                type="number"
                min={1}
                required
                value={newEvent.maxCapacity}
                onChange={(e) => setNewEvent({ ...newEvent, maxCapacity: e.target.value })}
                placeholder="Max Capacity"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <textarea
              rows={2}
              required
              minLength={10}
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="Event description..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button type="submit" className="rounded-xl gradient-brand px-5 py-2 text-xs font-semibold text-white">
              Create Event
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 overflow-x-auto dark:border-slate-800 dark:bg-[#11121d]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-4">Event</th>
                  <th className="py-2 pr-4">Club</th>
                  <th className="py-2 pr-4">Date &amp; Venue</th>
                  <th className="py-2 pr-4">Registrations</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allEvents.map((ev) => (
                  <tr key={ev.eventId} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="py-2.5 pr-4 font-semibold">{ev.title}</td>
                    <td className="py-2.5 pr-4">{ev.club.name}</td>
                    <td className="py-2.5 pr-4 text-slate-500">
                      {new Date(ev.eventDate).toLocaleDateString("en-IN")} · {ev.venue}
                    </td>
                    <td className="py-2.5 pr-4">
                      {ev.currentRegistrations}/{ev.maxCapacity}
                    </td>
                    <td className="py-2.5 pr-4">{ev.status}</td>
                    <td className="py-2.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleEventFeatured(ev.eventId, !ev.isFeatured)}
                        className={`font-semibold hover:underline ${
                          ev.isFeatured ? "text-amber-600" : "text-slate-500"
                        }`}
                      >
                        {ev.isFeatured ? "Featured" : "Feature"}
                      </button>
                      {ev.status === "UPCOMING" && (
                        <button
                          type="button"
                          onClick={() => handleCancelEvent(ev.eventId)}
                          className="text-rose-600 font-semibold hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: COORDINATORS */}
      {tab === "coordinators" && (
        <div className="space-y-6">
          <form onSubmit={handleAssignCoordinator} className="rounded-2xl border border-slate-200 bg-white p-6 grid grid-cols-1 gap-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-[#11121d]">
            <select
              required
              value={assignForm.coordinatorId}
              onChange={(e) => setAssignForm({ ...assignForm, coordinatorId: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Select Coordinator...</option>
              {coordinators.map((co) => (
                <option key={co.coordinatorId} value={co.coordinatorId}>
                  {co.user.fullName} ({co.email})
                </option>
              ))}
            </select>

            <select
              required
              value={assignForm.clubId}
              onChange={(e) => setAssignForm({ ...assignForm, clubId: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Select Club...</option>
              {allClubs.map((c) => (
                <option key={c.clubId} value={c.clubId}>
                  {c.name}
                </option>
              ))}
            </select>

            <button type="submit" className="rounded-xl gradient-brand px-4 py-2 text-xs font-semibold text-white">
              Assign Coordinator to Club
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 dark:border-slate-800 dark:bg-[#11121d]">
            {coordinators.map((co) => (
              <div key={co.coordinatorId} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <p className="font-bold text-sm">{co.user.fullName}</p>
                  <p className="text-xs text-slate-500">{co.email}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-0">
                  {co.assignments.length === 0 ? (
                    <span className="text-xs text-slate-400">No clubs assigned</span>
                  ) : (
                    co.assignments.map((a) => (
                      <span
                        key={a.club.clubId}
                        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                      >
                        {a.club.name}
                        <button
                          type="button"
                          title={`Remove ${a.club.name}`}
                          onClick={() => handleUnassignCoordinator(co.coordinatorId, a.club.clubId)}
                          className="rounded-full hover:text-rose-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: USERS & ROLES */}
      {tab === "users" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 overflow-x-auto dark:border-slate-800 dark:bg-[#11121d]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              User Accounts &amp; Role Governance
            </h2>
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search name or email..."
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">STUDENT</option>
                <option value="CLUB_COORDINATOR">CLUB_COORDINATOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 text-right">Change Role / Status</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => {
                  const roleOk = userRoleFilter === "ALL" || u.role === userRoleFilter;
                  const q = userSearch.trim().toLowerCase();
                  const qOk =
                    !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                  return roleOk && qOk;
                })
                .map((u) => (
                <tr key={u.userId} className="border-b border-slate-100 dark:border-slate-800/60">
                  <td className="py-2.5 pr-4 font-semibold">{u.fullName}</td>
                  <td className="py-2.5 pr-4">{u.email}</td>
                  <td className="py-2.5 pr-4 font-bold text-indigo-600">{u.role}</td>
                  <td className="py-2.5 pr-4">{u.isActive ? "Active" : "Disabled"}</td>
                  <td className="py-2.5 text-right space-x-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.userId, e.target.value, u.isActive)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="CLUB_COORDINATOR">CLUB_COORDINATOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRoleChange(u.userId, u.role, !u.isActive)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold dark:border-slate-700"
                    >
                      {u.isActive ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: INTERESTS */}
      {tab === "interests" && (
        <div className="space-y-6">
          <form onSubmit={handleCreateInterest} className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-wrap gap-3 dark:border-slate-800 dark:bg-[#11121d]">
            <input
              type="text"
              required
              value={newInterest.name}
              onChange={(e) => setNewInterest({ ...newInterest, name: e.target.value })}
              placeholder="New Interest Name (e.g. Quantum Computing)"
              className="flex-1 min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              value={newInterest.category}
              onChange={(e) => setNewInterest({ ...newInterest, category: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="TECHNOLOGY">TECHNOLOGY</option>
              <option value="CREATIVE">CREATIVE</option>
              <option value="CULTURAL">CULTURAL</option>
              <option value="OTHER">OTHER</option>
            </select>
            <button type="submit" className="rounded-xl gradient-brand px-5 py-2 text-xs font-semibold text-white">
              Add Interest
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <span key={i.interestId} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-800 dark:bg-[#11121d]">
                {i.name} <span className="text-slate-400">({i.category})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TAB: DBMS & PGVECTOR INSPECTOR */}
      {tab === "dbms" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              Live PostgreSQL &amp; pgvector Metadata
            </h2>
            {dbShowcase?.metadata ? (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-slate-400">pgvector Extension</p>
                  <p className="font-bold text-sm mt-0.5">
                    {dbShowcase.metadata.hasPgvector ? "Installed (vector)" : "Not Installed"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-slate-400">SQL Views</p>
                  <p className="font-bold text-sm mt-0.5">{dbShowcase.metadata.viewCount}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-slate-400">PostgreSQL Triggers</p>
                  <p className="font-bold text-sm mt-0.5">{dbShowcase.metadata.triggerCount}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-slate-400">Indexes (B-Tree/GIN/HNSW)</p>
                  <p className="font-bold text-sm mt-0.5">{dbShowcase.metadata.indexCount}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
            <h3 className="font-display text-base font-bold flex items-center gap-2 mb-3">
              <BrainCircuit className="h-4 w-4 text-indigo-600" />
              Embedding Provider Configuration
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Status:{" "}
              <strong>
                {overview.embeddingStatus.configured
                  ? `Active (${overview.embeddingStatus.provider} · ${overview.embeddingStatus.model})`
                  : "Not Configured"}
              </strong>
            </p>
            {overview.embeddingStatus.reason && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                {overview.embeddingStatus.reason}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
              <h3 className="font-display text-base font-bold mb-3">SQL View: v_popular_clubs</h3>
              {dbShowcase?.popularClubsView?.length ? (
                <div className="space-y-2 text-xs">
                  {dbShowcase.popularClubsView.map((r) => (
                    <div key={r.name} className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                      <span className="font-semibold">{r.name}</span>
                      <span>Score: {r.engagement_score} ({r.bookmark_count} bookmarks)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Run <code>npm run db:setup-sql</code> to create SQL views.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
              <h3 className="font-display text-base font-bold mb-3">Correlated Subquery: Above-Average Fill Events</h3>
              {dbShowcase?.aboveAverageEventsSubquery?.length ? (
                <div className="space-y-2 text-xs">
                  {dbShowcase.aboveAverageEventsSubquery.map((e) => (
                    <div key={e.title} className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                      <span className="font-semibold">{e.title}</span>
                      <span>{e.current_registrations}/{e.max_capacity} ({e.fill_pct}%)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No upcoming events matching subquery yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
              <h3 className="font-display text-base font-bold mb-3">SQL View: v_event_registration_stats</h3>
              {dbShowcase?.eventStatsView?.length ? (
                <div className="space-y-2 text-xs">
                  {dbShowcase.eventStatsView.slice(0, 8).map((ev) => (
                    <div key={ev.title} className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                      <span className="font-semibold">{ev.title} ({ev.club_name})</span>
                      <span>{ev.active_registrations}/{ev.max_capacity} ({ev.fill_percentage}%)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No event view data available.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
              <h3 className="font-display text-base font-bold mb-3">SQL Views: Club Events &amp; Student Summary</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-500 mb-1">v_club_event_summary (Top Active)</p>
                  {dbShowcase?.clubEventSummaryView?.length ? (
                    dbShowcase.clubEventSummaryView.slice(0, 5).map((c) => (
                      <div key={c.club_name} className="flex justify-between border-b border-slate-100 py-1 dark:border-slate-800">
                        <span>{c.club_name}</span>
                        <span>{c.total_events} events · {c.total_event_registrations} regs</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">No club event summaries yet.</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-500 mb-1">v_student_registration_summary</p>
                  {dbShowcase?.studentSummaryView?.length ? (
                    dbShowcase.studentSummaryView.slice(0, 5).map((s, idx) => (
                      <div key={`${s.full_name}-${idx}`} className="flex justify-between border-b border-slate-100 py-1 dark:border-slate-800">
                        <span>{s.full_name} ({s.srn || "No SRN"})</span>
                        <span>{s.active_event_registrations} events · {s.memberships} clubs · {s.bookmarked_clubs} saved</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">No student summaries yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
