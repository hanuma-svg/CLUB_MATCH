import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Compass,
  Database,
  Layers,
  Quote,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ClubCard } from "@/components/clubs/ClubCard";
import { EventCard } from "@/components/events/EventCard";
import { HeroVisual } from "@/components/home/HeroVisual";

export const dynamic = "force-dynamic";

async function getHomeData() {
  try {
    const [
      featuredClubs,
      popularClubs,
      upcomingEvents,
      interests,
      totalClubs,
      totalResearchCenters,
      totalEvents,
      totalStudents,
      totalRegistrations,
    ] = await Promise.all([
      prisma.club.findMany({
        where: { status: "ACTIVE", isFeatured: true },
        take: 6,
        orderBy: [{ memberCount: "desc" }],
        include: {
          interests: { include: { interest: true } },
          _count: { select: { events: true } },
        },
      }),
      prisma.club.findMany({
        where: { status: "ACTIVE" },
        take: 6,
        orderBy: [{ memberCount: "desc" }, { bookmarks: { _count: "desc" } }],
        include: {
          interests: { include: { interest: true } },
          _count: { select: { events: true } },
        },
      }),
      prisma.event.findMany({
        where: { status: "UPCOMING" },
        take: 6,
        orderBy: [{ isFeatured: "desc" }, { eventDate: "asc" }],
        include: {
          club: { select: { clubId: true, name: true, slug: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.interest.findMany({
        take: 12,
        orderBy: [{ clubs: { _count: "desc" } }, { name: "asc" }],
        include: { _count: { select: { clubs: true } } },
      }),
      prisma.club.count({ where: { status: "ACTIVE", category: { not: "RESEARCH_CENTER" } } }),
      prisma.club.count({ where: { status: "ACTIVE", category: "RESEARCH_CENTER" } }),
      prisma.event.count(),
      prisma.student.count(),
      prisma.eventRegistration.count({ where: { status: { in: ["REGISTERED", "ATTENDED"] } } }),
    ]);

    return {
      dbConnected: true,
      featuredClubs,
      popularClubs,
      upcomingEvents,
      interests,
      stats: {
        totalClubs,
        totalResearchCenters,
        totalEvents,
        totalStudents,
        totalRegistrations,
      },
    };
  } catch {
    return {
      dbConnected: false,
      featuredClubs: [],
      popularClubs: [],
      upcomingEvents: [],
      interests: [],
      stats: {
        totalClubs: 0,
        totalResearchCenters: 0,
        totalEvents: 0,
        totalStudents: 0,
        totalRegistrations: 0,
      },
    };
  }
}

const SAMPLE_TESTIMONIALS = [
  {
    name: "Sample Student — CSE Sem 4",
    role: "Technical & AI Track",
    quote:
      "Selecting Machine Learning and Cybersecurity during onboarding immediately surfaced NeuralHive, Layer8, and C3I research labs in one clean dashboard.",
  },
  {
    name: "Sample Student — ECE Sem 6",
    role: "Robotics & Cultural Track",
    quote:
      "I always heard about clubs too late in the semester. Having upcoming campus workshops and instant capacity-checked registration fixed that.",
  },
  {
    name: "Sample Coordinator — Tech Club",
    role: "Club Coordinator Demo",
    quote:
      "Creating events, tracking capacity, and viewing student registrations from one portal eliminates messy spreadsheets.",
  },
];

export default async function HomePage() {
  const data = await getHomeData();

  return (
    <div className="flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="border-b border-slate-200/90 bg-slate-50/50 py-16 sm:py-20 dark:border-slate-800 dark:bg-[#0a0b10]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              PES University EC Campus · PostgreSQL &amp; pgvector Platform
            </span>

            <h1 className="mt-5 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              Find your people.{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                Discover your passion.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Explore student communities, discover campus events, and connect with peers who share
              your technical, cultural, and research interests.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/clubs"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
              >
                Explore Clubs
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Get Started
              </Link>
            </div>
{!data.dbConnected && (
  <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
    <strong>Database setup pending:</strong> Configure <code>DATABASE_URL</code> in{" "}
    <code>.env</code>, run Prisma migrations &amp; seed to populate live clubs and events.
  </div>
)}
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* 2. PLATFORM STATISTICS */}
      <section className="border-b border-slate-200/90 bg-white py-8 dark:border-slate-800 dark:bg-[#0e0f17]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
          {[
            { label: "Student Clubs", value: data.stats.totalClubs, icon: Users },
            { label: "Research Centers", value: data.stats.totalResearchCenters, icon: Layers },
            { label: "Campus Events", value: data.stats.totalEvents, icon: Calendar },
            { label: "Event Registrations", value: data.stats.totalRegistrations, icon: CalendarCheck },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-mono text-xl font-semibold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. FEATURED CLUBS */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Curated Directory
              </span>
              <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-white">
                Featured Clubs &amp; Labs
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                PES University EC Campus student clubs and research centers.
              </p>
            </div>
            <Link
              href="/clubs"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View All Clubs
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.featuredClubs.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.featuredClubs.map((club) => (
                <ClubCard key={club.clubId} club={club} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              No featured clubs loaded yet. Run <code>npm run db:seed</code> after setting up PostgreSQL.
            </div>
          )}
        </div>
      </section>

      {/* 4. EXPLORE BY INTEREST */}
      <section className="border-y border-slate-200/90 bg-white py-14 dark:border-slate-800 dark:bg-[#0e0f17]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Interest-Driven Discovery
              </span>
              <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-white">
                Explore by Interest
              </h2>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Personalize Your Interests
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.interests.map((interest) => (
              <Link
                key={interest.interestId}
                href={`/clubs?interest=${encodeURIComponent(interest.slug)}`}
                className="group rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 shadow-sm transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900"
              >
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {interest.category}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors">
                  {interest.name}
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">
                  {interest._count.clubs} clubs
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. UPCOMING EVENTS */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Campus Calendar
              </span>
              <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-white">
                Upcoming Events
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Real-time capacity tracking with transactional seat reservation.
              </p>
            </div>
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Browse All Events
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.upcomingEvents.length > 0 ? (
            <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.upcomingEvents.map((ev) => (
                <EventCard key={ev.eventId} event={ev} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
              No upcoming events found.
            </div>
          )}
        </div>
      </section>

      {/* 6. POPULAR CLUBS */}
      <section className="border-t border-slate-200/90 bg-white py-14 dark:border-slate-800 dark:bg-[#0e0f17]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Community Ranking
              </span>
              <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-white">
                Popular Clubs
              </h2>
            </div>
            <Link
              href="/clubs?sort=popular"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              See Popularity Ranking
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.popularClubs.map((club) => (
              <ClubCard key={club.clubId} club={club} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. HOW CLUBMATCH WORKS & 8. PERSONALIZED RECOMMENDATIONS */}
      <section id="how-it-works" className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              Architecture &amp; Workflow
            </span>
            <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-white">
              How ClubMatch Works
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Pairing normalized PostgreSQL relational schemas with pgvector cosine similarity search.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Select Interests",
                desc: "Choose from 25 technology, creative, cultural, and research interests stored in student_interests.",
                icon: Compass,
              },
              {
                step: "02",
                title: "pgvector Cosine Matching",
                desc: "Your profile and club descriptions are embedded into 768-d vectors and ranked using pgvector cosine distance (<=>).",
                icon: BrainCircuit,
              },
              {
                step: "03",
                title: "Transactional Registration",
                desc: "Reserve seats in campus workshops and hackathons with PostgreSQL row-level locks (FOR UPDATE) preventing overbooking.",
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#11131c]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-xs font-medium text-slate-400">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Personalized Recommendations Banner */}
          <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-7 sm:p-8 text-white shadow-sm">
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                  <Database className="h-3 w-3" />
                  PostgreSQL + pgvector HNSW Index
                </div>
                <h3 className="mt-2.5 font-display text-xl sm:text-2xl font-semibold">
                  Personalized Recommendations Built Into PostgreSQL
                </h3>
                <p className="mt-1.5 text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Unlike keyword matching, semantic search discovers relevant clubs even when wording differs—for
                  example, matching &ldquo;deep learning&rdquo; with &ldquo;neural networks&rdquo; and &ldquo;cognitive computing&rdquo; research centers.
                </p>
              </div>
              <div className="flex flex-wrap lg:justify-end gap-2.5">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Select Interests
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/clubs"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                  Search Catalog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. STUDENT TESTIMONIALS (CLEARLY LABELED SAMPLE CONTENT) */}
      <section className="border-t border-slate-200/90 bg-white py-14 dark:border-slate-800 dark:bg-[#0e0f17]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Sample Content · Academic Demo
              </span>
              <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-white">
                Student &amp; Coordinator Experiences
              </h2>
            </div>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Sample Testimonials
            </span>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-3">
            {SAMPLE_TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/30"
              >
                <Quote className="h-5 w-5 text-slate-400" />
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 border-t border-slate-200/60 pt-3 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
