"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/layout/ToastProvider";

interface EventDetailResponse {
  event: {
    eventId: string;
    slug: string;
    title: string;
    description: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    venue: string;
    registrationDeadline: string;
    maxCapacity: number;
    currentRegistrations: number;
    status: string;
    isSampleEvent: boolean;
    club: {
      clubId: string;
      name: string;
      slug: string;
      category: string;
      interests: Array<{ interest: { interestId: string; name: string } }>;
    };
    category: { name: string };
  };
  registrationStatus: string | null;
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [data, setData] = useState<EventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  async function handleRegister() {
    if (!data) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(data.event.eventId)}/register`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        showToast({ type: "error", title: "Registration failed", message: json.error });
        setSubmitting(false);
        return;
      }
      showToast({
        type: "success",
        title: "Seat Confirmed!",
        message: "Transactional registration recorded in PostgreSQL.",
      });
      await loadEvent();
    } catch {
      showToast({ type: "error", title: "Network error during registration" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!data) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(data.event.eventId)}/register`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        showToast({ type: "error", title: "Cancellation failed", message: json.error });
        setSubmitting(false);
        return;
      }
      showToast({ type: "info", title: "Registration cancelled", message: "Seat released." });
      await loadEvent();
    } catch {
      showToast({ type: "error", title: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Event not found</h1>
        <Link href="/events" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600">
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
      </div>
    );
  }

  const { event, registrationStatus } = data;
  const seatsLeft = Math.max(0, event.maxCapacity - event.currentRegistrations);
  const deadlinePassed = new Date() > new Date(event.registrationDeadline);
  const isRegistered = registrationStatus === "REGISTERED" || registrationStatus === "ATTENDED";
  const isFull = seatsLeft <= 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Events
      </Link>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card dark:border-slate-800 dark:bg-[#11121d]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            {event.category.name}
          </span>
          {event.isSampleEvent && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              Sample Event · Academic Demo
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Status: {event.status}
          </span>
        </div>

        <h1 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
          {event.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Organized by{" "}
          <Link href={`/clubs/${event.club.slug}`} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            {event.club.name}
          </Link>
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Event Overview
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {event.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Event Date</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {new Date(event.eventDate).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Time</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {event.startTime} – {event.endTime}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Venue</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{event.venue}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Registration Deadline</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {new Date(event.registrationDeadline).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Box */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900/60">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Available Seats</span>
                <span className="font-display text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {seatsLeft} / {event.maxCapacity}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full gradient-brand"
                  style={{ width: `${Math.min(100, (event.currentRegistrations / event.maxCapacity) * 100)}%` }}
                />
              </div>

              <div className="mt-5 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Protected by PostgreSQL row-level lock (<code>FOR UPDATE</code>) and{" "}
                  <code>UNIQUE(student_id, event_id)</code>.
                </span>
              </div>
            </div>

            <div className="mt-6">
              {!session?.user ? (
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md"
                >
                  Sign In as Student to Register
                </Link>
              ) : session.user.role !== "STUDENT" ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Signed in as <strong>{session.user.role}</strong>. Event registration is for Student accounts.
                </div>
              ) : isRegistered ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Registered ({registrationStatus})
                  </div>
                  {event.status !== "COMPLETED" && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleCancel}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-400"
                    >
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Cancel Registration
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting || isFull || deadlinePassed || event.status !== "UPCOMING"}
                  onClick={handleRegister}
                  className="flex w-full items-center justify-center gap-2 rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {event.status !== "UPCOMING"
                    ? `Event ${event.status}`
                    : deadlinePassed
                      ? "Registration Deadline Passed"
                      : isFull
                        ? "Event Full"
                        : "Register Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
