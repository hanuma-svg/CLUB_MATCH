"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Calendar, Loader2, MapPin, XCircle } from "lucide-react";
import { useToast } from "@/components/layout/ToastProvider";

interface RegistrationRow {
  registrationId: string;
  status: string;
  registeredAt: string;
  cancelledAt: string | null;
  event: {
    eventId: string;
    slug: string;
    title: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    venue: string;
    status: string;
    club: { name: string; slug: string };
    category: { name: string };
  };
}

export default function MyRegistrationsPage() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students/registrations");
      if (res.ok) {
        const data = await res.json();
        setRows(data.registrations || []);
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

  async function handleCancel(eventId: string) {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/register`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (res.ok) {
      showToast({ type: "info", title: "Registration cancelled" });
      await load();
    } else {
      showToast({ type: "error", title: "Unable to cancel", message: json.error });
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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            My Event Registrations
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            View active, attended, and cancelled event registrations.
          </p>
        </div>
        <Link href="/events" className="text-xs font-semibold text-indigo-600 hover:underline">
          Browse More Events →
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 dark:border-slate-700">
          You haven&apos;t registered for any events yet.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => (
            <div
              key={r.registrationId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#11121d]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      r.status === "REGISTERED"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : r.status === "ATTENDED"
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {r.status}
                  </span>
                  <span className="text-xs text-slate-500">{r.event.category.name}</span>
                </div>
                <Link
                  href={`/events/${r.event.slug}`}
                  className="mt-1.5 block font-display text-lg font-bold text-slate-900 hover:text-indigo-600 dark:text-white"
                >
                  {r.event.title}
                </Link>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">by {r.event.club.name}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(r.event.eventDate).toLocaleDateString("en-IN")} · {r.event.startTime}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {r.event.venue}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  href={`/events/${r.event.slug}`}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Details
                </Link>
                {r.status === "REGISTERED" && r.event.status !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={() => handleCancel(r.event.eventId)}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
