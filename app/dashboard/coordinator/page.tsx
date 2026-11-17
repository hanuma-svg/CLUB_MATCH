"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Edit3,
  Loader2,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/layout/ToastProvider";

interface CoordinatorClub {
  clubId: string;
  slug: string;
  name: string;
  category: string;
  tagline: string | null;
  description: string;
  activities: string;
  memberCount: number;
  assignmentTitle: string;
  events: Array<{
    eventId: string;
    slug: string;
    title: string;
    description: string;
    eventDate: string;
    registrationDeadline: string;
    startTime: string;
    endTime: string;
    venue: string;
    maxCapacity: number;
    currentRegistrations: number;
    status: string;
    category: { categoryId: string; name: string };
    registrations: Array<{
      registrationId: string;
      status: string;
      registeredAt: string;
      student: {
        studentId: string;
        srn: string | null;
        department: string | null;
        user: { fullName: string; email: string };
      };
    }>;
  }>;
}

export default function CoordinatorDashboardPage() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();

  const [clubs, setClubs] = useState<CoordinatorClub[]>([]);
  const [categories, setCategories] = useState<Array<{ categoryId: string; name: string }>>([]);
  const [activities, setActivities] = useState<Array<{ activityId: string; summary: string; createdAt: string }>>([]);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [loading, setLoading] = useState(true);

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showProposeClub, setShowProposeClub] = useState(false);
  const [editingClub, setEditingClub] = useState(false);
  const [clubForm, setClubForm] = useState({ tagline: "", description: "", activities: "" });
  const [proposeClubForm, setProposeClubForm] = useState({
    name: "",
    category: "TECHNICAL",
    tagline: "",
    description: "",
    activities: "",
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    eventDate: "",
    registrationDeadline: "",
    startTime: "15:00",
    endTime: "17:00",
    venue: "EC Campus Seminar Hall 1",
    maxCapacity: "80",
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventForm, setEditEventForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    eventDate: "",
    registrationDeadline: "",
    startTime: "",
    endTime: "",
    venue: "",
    maxCapacity: "",
    status: "UPCOMING",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coordinator/dashboard");
      if (res.ok) {
        const json = await res.json();
        const assigned: CoordinatorClub[] = json.assignedClubs || [];
        setClubs(assigned);
        setCategories(json.categories || []);
        setActivities(json.activities || []);

        if (assigned.length > 0) {
          const active = assigned.find((c) => c.clubId === selectedClubId) || assigned[0];
          setSelectedClubId(active.clubId);
          setClubForm({
            tagline: active.tagline || "",
            description: active.description,
            activities: active.activities,
          });
        }
        if (json.categories?.length && !eventForm.categoryId) {
          setEventForm((f) => ({ ...f, categoryId: json.categories[0].categoryId }));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [eventForm.categoryId, selectedClubId]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "CLUB_COORDINATOR") {
      loadData();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [loadData, session?.user?.role, status]);

  const activeClub = clubs.find((c) => c.clubId === selectedClubId) || clubs[0];

  async function handleUpdateClub(e: React.FormEvent) {
    e.preventDefault();
    if (!activeClub) return;

    const res = await fetch(`/api/clubs/${encodeURIComponent(activeClub.clubId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clubForm),
    });

    if (res.ok) {
      showToast({ type: "success", title: "Club information updated" });
      setEditingClub(false);
      await loadData();
    } else {
      const err = await res.json();
      showToast({ type: "error", title: "Failed to update club", message: err.error });
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!activeClub) return;

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...eventForm,
        clubId: activeClub.clubId,
        maxCapacity: Number(eventForm.maxCapacity),
        eventDate: new Date(eventForm.eventDate).toISOString(),
        registrationDeadline: new Date(eventForm.registrationDeadline).toISOString(),
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      showToast({ type: "error", title: "Event creation failed", message: json.error });
      return;
    }

    showToast({ type: "success", title: "Event created!" });
    setShowCreateEvent(false);
    setEventForm((f) => ({ ...f, title: "", description: "" }));
    await loadData();
  }

  function toDateTimeLocal(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEditEvent(ev: CoordinatorClub["events"][number]) {
    setEditingEventId(ev.eventId);
    setEditEventForm({
      title: ev.title,
      description: ev.description,
      categoryId: ev.category.categoryId,
      eventDate: toDateTimeLocal(ev.eventDate),
      registrationDeadline: toDateTimeLocal(ev.registrationDeadline),
      startTime: ev.startTime,
      endTime: ev.endTime,
      venue: ev.venue,
      maxCapacity: String(ev.maxCapacity),
      status: ev.status,
    });
  }

  async function handleSaveEventEdit(e: React.FormEvent, eventId: string) {
    e.preventDefault();
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editEventForm.title,
        description: editEventForm.description,
        categoryId: editEventForm.categoryId,
        eventDate: new Date(editEventForm.eventDate).toISOString(),
        registrationDeadline: new Date(editEventForm.registrationDeadline).toISOString(),
        startTime: editEventForm.startTime,
        endTime: editEventForm.endTime,
        venue: editEventForm.venue,
        maxCapacity: Number(editEventForm.maxCapacity),
        status: editEventForm.status,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast({ type: "error", title: "Cannot update event", message: json.error });
      return;
    }
    showToast({ type: "success", title: "Event details updated" });
    setEditingEventId(null);
    await loadData();
  }

  async function handleProposeClub(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...proposeClubForm, isSampleDescription: false }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast({ type: "error", title: "Club proposal failed", message: json.error });
      return;
    }
    showToast({
      type: "success",
      title: "Club proposal submitted",
      message: "Your club submission is PENDING admin approval.",
    });
    setShowProposeClub(false);
    setProposeClubForm({ name: "", category: "TECHNICAL", tagline: "", description: "", activities: "" });
  }

  async function handleCancelEvent(eventId: string) {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast({ type: "info", title: "Event cancelled" });
      await loadData();
    }
  }

  async function handleUpdateRegStatus(registrationId: string, nextStatus: "ATTENDED" | "CANCELLED") {
    const res = await fetch("/api/coordinator/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId, status: nextStatus }),
    });
    if (res.ok) {
      showToast({ type: "success", title: `Marked as ${nextStatus}` });
      await loadData();
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "CLUB_COORDINATOR") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Club Coordinator Access Required</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Only users assigned the CLUB_COORDINATOR role can manage club events and registrations.
        </p>
        <Link href="/login" className="mt-6 inline-block rounded-xl gradient-brand px-6 py-2.5 text-sm font-semibold text-white">
          Sign In
        </Link>
      </div>
    );
  }

  if (!activeClub) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">No Assigned Clubs Yet</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Ask a Platform Administrator to assign a club to your coordinator account.
        </p>
      </div>
    );
  }

  const totalRegs = activeClub.events.reduce((acc, ev) => acc + ev.currentRegistrations, 0);
  const upcomingCount = activeClub.events.filter((e) => e.status === "UPCOMING").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Coordinator Workspace · Scoped to Assigned Clubs
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">
            {activeClub.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Role: {activeClub.assignmentTitle} · {activeClub.category.replace(/_/g, " ")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {clubs.length > 1 && (
            <select
              value={activeClub.clubId}
              onChange={(e) => {
                const c = clubs.find((x) => x.clubId === e.target.value);
                setSelectedClubId(e.target.value);
                if (c) {
                  setClubForm({ tagline: c.tagline || "", description: c.description, activities: c.activities });
                }
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
            >
              {clubs.map((c) => (
                <option key={c.clubId} value={c.clubId}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setEditingClub((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Club Info
          </button>
          <button
            type="button"
            onClick={() => setShowProposeClub((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Building2 className="h-3.5 w-3.5" />
            Propose Club
          </button>
          <button
            type="button"
            onClick={() => setShowCreateEvent((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl gradient-brand px-4 py-2 text-xs font-semibold text-white shadow-sm"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Create Event
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Club Members", value: activeClub.memberCount },
          { label: "Total Events", value: activeClub.events.length },
          { label: "Upcoming Events", value: upcomingCount },
          { label: "Active Registrations", value: totalRegs },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#11121d]">
            <p className="text-xs font-medium text-slate-500">{k.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Edit Club Form */}
      {editingClub && (
        <form onSubmit={handleUpdateClub} className="rounded-2xl border border-indigo-200 bg-white p-6 space-y-4 dark:border-indigo-900 dark:bg-[#11121d]">
          <h2 className="font-display text-lg font-bold">Update Club Profile</h2>
          <input
            type="text"
            value={clubForm.tagline}
            onChange={(e) => setClubForm({ ...clubForm, tagline: e.target.value })}
            placeholder="Tagline"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <textarea
            rows={3}
            required
            value={clubForm.description}
            onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
            placeholder="Club description"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <textarea
            rows={2}
            required
            value={clubForm.activities}
            onChange={(e) => setClubForm({ ...clubForm, activities: e.target.value })}
            placeholder="Club activities"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl gradient-brand px-5 py-2 text-xs font-semibold text-white">
              Save Changes
            </button>
            <button type="button" onClick={() => setEditingClub(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Propose New Club Form */}
      {showProposeClub && (
        <form onSubmit={handleProposeClub} className="rounded-2xl border border-indigo-200 bg-white p-6 space-y-4 dark:border-indigo-900 dark:bg-[#11121d]">
          <h2 className="font-display text-lg font-bold">Propose New Club (Requires Admin Approval)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input
              type="text"
              required
              minLength={2}
              value={proposeClubForm.name}
              onChange={(e) => setProposeClubForm({ ...proposeClubForm, name: e.target.value })}
              placeholder="Proposed Club Name"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              value={proposeClubForm.category}
              onChange={(e) => setProposeClubForm({ ...proposeClubForm, category: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="TECHNICAL">Technical Club</option>
              <option value="NON_TECHNICAL">Non-Technical Club</option>
              <option value="CULTURAL">Cultural Club</option>
              <option value="RESEARCH_CENTER">Research Center</option>
            </select>
            <input
              type="text"
              value={proposeClubForm.tagline}
              onChange={(e) => setProposeClubForm({ ...proposeClubForm, tagline: e.target.value })}
              placeholder="Short tagline"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <textarea
            rows={2}
            required
            minLength={10}
            value={proposeClubForm.description}
            onChange={(e) => setProposeClubForm({ ...proposeClubForm, description: e.target.value })}
            placeholder="Club description and mission..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <input
            type="text"
            required
            minLength={3}
            value={proposeClubForm.activities}
            onChange={(e) => setProposeClubForm({ ...proposeClubForm, activities: e.target.value })}
            placeholder="Planned activities (e.g. workshops, hackathons, meetups)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl gradient-brand px-5 py-2 text-xs font-semibold text-white">
              Submit Proposal
            </button>
            <button type="button" onClick={() => setShowProposeClub(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Create Event Form */}
      {showCreateEvent && (
        <form onSubmit={handleCreateEvent} className="rounded-2xl border border-indigo-200 bg-white p-6 space-y-4 dark:border-indigo-900 dark:bg-[#11121d]">
          <h2 className="font-display text-lg font-bold">Create New Event for {activeClub.name}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="text"
              required
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              placeholder="Event title"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              value={eventForm.categoryId}
              onChange={(e) => setEventForm({ ...eventForm, categoryId: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {categories.map((cat) => (
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
                value={eventForm.eventDate}
                onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Registration Deadline</label>
              <input
                type="datetime-local"
                required
                value={eventForm.registrationDeadline}
                onChange={(e) => setEventForm({ ...eventForm, registrationDeadline: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <input
              type="text"
              required
              value={eventForm.venue}
              onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
              placeholder="Venue"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={eventForm.startTime}
                onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                placeholder="Start"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                type="text"
                required
                value={eventForm.endTime}
                onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                placeholder="End"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                type="number"
                min={1}
                required
                value={eventForm.maxCapacity}
                onChange={(e) => setEventForm({ ...eventForm, maxCapacity: e.target.value })}
                placeholder="Capacity"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>
          <textarea
            rows={3}
            required
            value={eventForm.description}
            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            placeholder="Event description..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl gradient-brand px-5 py-2 text-xs font-semibold text-white">
              Publish Event
            </button>
            <button type="button" onClick={() => setShowCreateEvent(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Events & Registered Students */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Club Events &amp; Registered Students
        </h2>
        {activeClub.events.map((ev) => (
          <div key={ev.eventId} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {ev.category.name}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{ev.status}</span>
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                  {ev.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {new Date(ev.eventDate).toLocaleDateString("en-IN")} · {ev.venue} ·{" "}
                  <strong>
                    {ev.currentRegistrations}/{ev.maxCapacity}
                  </strong>{" "}
                  registered
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    editingEventId === ev.eventId ? setEditingEventId(null) : startEditEvent(ev)
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {editingEventId === ev.eventId ? "Close Edit" : "Edit Event"}
                </button>

                {ev.status === "UPCOMING" && (
                  <button
                    type="button"
                    onClick={() => handleCancelEvent(ev.eventId)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900"
                  >
                    Cancel Event
                  </button>
                )}
              </div>
            </div>

            {editingEventId === ev.eventId && (
              <form
                onSubmit={(e) => handleSaveEventEdit(e, ev.eventId)}
                className="mt-4 rounded-xl border border-indigo-200 bg-slate-50 p-4 space-y-3 dark:border-indigo-900/60 dark:bg-slate-900/60"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    required
                    value={editEventForm.title}
                    onChange={(e) => setEditEventForm({ ...editEventForm, title: e.target.value })}
                    placeholder="Event title"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <select
                    value={editEventForm.categoryId}
                    onChange={(e) => setEditEventForm({ ...editEventForm, categoryId: e.target.value })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                    {categories.map((cat) => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editEventForm.status}
                    onChange={(e) => setEditEventForm({ ...editEventForm, status: e.target.value })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="ONGOING">ONGOING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500">Event Date</label>
                    <input
                      type="datetime-local"
                      required
                      value={editEventForm.eventDate}
                      onChange={(e) => setEditEventForm({ ...editEventForm, eventDate: e.target.value })}
                      className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500">Registration Deadline</label>
                    <input
                      type="datetime-local"
                      required
                      value={editEventForm.registrationDeadline}
                      onChange={(e) =>
                        setEditEventForm({ ...editEventForm, registrationDeadline: e.target.value })
                      }
                      className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500">
                      Capacity (min {ev.currentRegistrations || 1})
                    </label>
                    <input
                      type="number"
                      min={ev.currentRegistrations || 1}
                      required
                      value={editEventForm.maxCapacity}
                      onChange={(e) => setEditEventForm({ ...editEventForm, maxCapacity: e.target.value })}
                      className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    value={editEventForm.venue}
                    onChange={(e) => setEditEventForm({ ...editEventForm, venue: e.target.value })}
                    placeholder="Venue"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    required
                    value={editEventForm.startTime}
                    onChange={(e) => setEditEventForm({ ...editEventForm, startTime: e.target.value })}
                    placeholder="Start time"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    required
                    value={editEventForm.endTime}
                    onChange={(e) => setEditEventForm({ ...editEventForm, endTime: e.target.value })}
                    placeholder="End time"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  value={editEventForm.description}
                  onChange={(e) => setEditEventForm({ ...editEventForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <div className="flex gap-2">
                  <button type="submit" className="rounded-lg gradient-brand px-4 py-1.5 text-xs font-semibold text-white">
                    Save Event Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingEventId(null)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Registered students table */}
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <Users className="h-3.5 w-3.5" />
                Registered Students ({ev.registrations.length})
              </p>
              {ev.registrations.length === 0 ? (
                <p className="text-xs text-slate-500">No student registrations yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 dark:border-slate-800">
                        <th className="py-2 pr-4">Student</th>
                        <th className="py-2 pr-4">SRN</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ev.registrations.map((reg) => (
                        <tr key={reg.registrationId} className="border-b border-slate-50 dark:border-slate-800/50">
                          <td className="py-2 pr-4 font-semibold text-slate-900 dark:text-white">
                            {reg.student.user.fullName}
                          </td>
                          <td className="py-2 pr-4 text-slate-500">{reg.student.srn || "—"}</td>
                          <td className="py-2 pr-4 text-slate-500">{reg.student.user.email}</td>
                          <td className="py-2 pr-4">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-slate-800">
                              {reg.status}
                            </span>
                          </td>
                          <td className="py-2 text-right space-x-2">
                            {reg.status === "REGISTERED" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRegStatus(reg.registrationId, "ATTENDED")}
                                  className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Attended
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRegStatus(reg.registrationId, "CANCELLED")}
                                  className="inline-flex items-center gap-1 text-rose-600 hover:underline font-semibold"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Cancel
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Activity */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11121d]">
        <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-indigo-600" />
          Recent Club Activity
        </h2>
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
          {activities.length === 0 ? (
            <p>No recent activity recorded.</p>
          ) : (
            activities.map((a) => (
              <div key={a.activityId} className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span>{a.summary}</span>
                <span className="text-slate-400 shrink-0 ml-4">
                  {new Date(a.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
