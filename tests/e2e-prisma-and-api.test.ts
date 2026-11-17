import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_CLUBS, SEED_EVENT_CATEGORIES, SEED_INTERESTS } from "@/prisma/seed-data";
import { slugify } from "@/lib/slug";

type MockSessionUser = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: "STUDENT" | "CLUB_COORDINATOR" | "ADMIN";
  studentId?: string | null;
  coordinatorId?: string | null;
  adminId?: string | null;
};

const authState = vi.hoisted(() => ({
  user: null as MockSessionUser | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => (authState.user ? { user: authState.user } : null)),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

describe("ClubMatch E2E Prisma + pgvector + Route Handler Suite", () => {
  let db: PGlite;
  let socketServer: PGLiteSocketServer;
  let prisma: typeof import("@/lib/prisma").prisma;

  let clubDetailRoute: typeof import("@/app/api/clubs/[id]/route");
  let membershipRoute: typeof import("@/app/api/clubs/[id]/membership/route");
  let eventRegisterRoute: typeof import("@/app/api/events/[id]/register/route");
  let eventsRoute: typeof import("@/app/api/events/route");
  let dbShowcaseRoute: typeof import("@/app/api/admin/db-showcase/route");
  let semanticSearchCatalog: typeof import("@/lib/recommendations").semanticSearchCatalog;

  let adminSession: MockSessionUser;
  let assignedCoordSession: MockSessionUser;
  let unassignedCoordSession: MockSessionUser;
  let student1Session: MockSessionUser;
  let student2Session: MockSessionUser;

  let neuralClubId = "";
  let danceClubId = "";
  let pendingClubId = "";
  let oneSeatEventId = "";
  let techCategoryId = "";

  function makeReq(url: string, method: string, body?: unknown) {
    return new NextRequest(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  beforeAll(async () => {
    db = new PGlite({ extensions: { vector } });
    await db.waitReady;

    const sqlDir = path.join(process.cwd(), "database", "sql");
    await db.exec(fs.readFileSync(path.join(sqlDir, "schema.sql"), "utf8"));
    await db.exec(fs.readFileSync(path.join(sqlDir, "views.sql"), "utf8"));
    await db.exec(fs.readFileSync(path.join(sqlDir, "triggers.sql"), "utf8"));
    await db.exec(fs.readFileSync(path.join(sqlDir, "indexes.sql"), "utf8"));

    socketServer = new PGLiteSocketServer({
      db,
      host: "127.0.0.1",
      port: 15432,
    });
    await socketServer.start();
    const conn = socketServer.getServerConn();

    process.env.DATABASE_URL = `postgresql://postgres:postgres@${conn}/postgres?sslmode=disable&connection_limit=1`;
    vi.resetModules();

    ({ prisma } = await import("@/lib/prisma"));
    clubDetailRoute = await import("@/app/api/clubs/[id]/route");
    membershipRoute = await import("@/app/api/clubs/[id]/membership/route");
    eventRegisterRoute = await import("@/app/api/events/[id]/register/route");
    eventsRoute = await import("@/app/api/events/route");
    dbShowcaseRoute = await import("@/app/api/admin/db-showcase/route");
    ({ semanticSearchCatalog } = await import("@/lib/recommendations"));

    const hash = await bcrypt.hash("Test@1234", 10);

    // Users
    const adminAcc = await prisma.userAccount.create({
      data: {
        email: "admin.e2e@clubmatch.pes.edu",
        passwordHash: hash,
        fullName: "Admin E2E",
        role: "ADMIN",
        admin: { create: { email: "admin.e2e@clubmatch.pes.edu", designation: "Admin" } },
      },
      include: { admin: true },
    });
    adminSession = {
      id: adminAcc.userId,
      userId: adminAcc.userId,
      email: adminAcc.email,
      fullName: adminAcc.fullName,
      role: "ADMIN",
      adminId: adminAcc.admin!.adminId,
    };

    const coord1Acc = await prisma.userAccount.create({
      data: {
        email: "coord1.e2e@clubmatch.pes.edu",
        passwordHash: hash,
        fullName: "Assigned Coordinator",
        role: "CLUB_COORDINATOR",
        clubCoordinator: { create: { email: "coord1.e2e@clubmatch.pes.edu", phone: "9000000001" } },
      },
      include: { clubCoordinator: true },
    });
    assignedCoordSession = {
      id: coord1Acc.userId,
      userId: coord1Acc.userId,
      email: coord1Acc.email,
      fullName: coord1Acc.fullName,
      role: "CLUB_COORDINATOR",
      coordinatorId: coord1Acc.clubCoordinator!.coordinatorId,
    };

    const coord2Acc = await prisma.userAccount.create({
      data: {
        email: "coord2.e2e@clubmatch.pes.edu",
        passwordHash: hash,
        fullName: "Unassigned Coordinator",
        role: "CLUB_COORDINATOR",
        clubCoordinator: { create: { email: "coord2.e2e@clubmatch.pes.edu", phone: "9000000002" } },
      },
      include: { clubCoordinator: true },
    });
    unassignedCoordSession = {
      id: coord2Acc.userId,
      userId: coord2Acc.userId,
      email: coord2Acc.email,
      fullName: coord2Acc.fullName,
      role: "CLUB_COORDINATOR",
      coordinatorId: coord2Acc.clubCoordinator!.coordinatorId,
    };

    const stu1Acc = await prisma.userAccount.create({
      data: {
        email: "stu1.e2e@clubmatch.pes.edu",
        passwordHash: hash,
        fullName: "Student One",
        role: "STUDENT",
        student: {
          create: {
            email: "stu1.e2e@clubmatch.pes.edu",
            srn: "PES2UG24CS101",
            department: "CSE",
            semester: 4,
            onboardingCompleted: true,
          },
        },
      },
      include: { student: true },
    });
    student1Session = {
      id: stu1Acc.userId,
      userId: stu1Acc.userId,
      email: stu1Acc.email,
      fullName: stu1Acc.fullName,
      role: "STUDENT",
      studentId: stu1Acc.student!.studentId,
    };

    const stu2Acc = await prisma.userAccount.create({
      data: {
        email: "stu2.e2e@clubmatch.pes.edu",
        passwordHash: hash,
        fullName: "Student Two",
        role: "STUDENT",
        student: {
          create: {
            email: "stu2.e2e@clubmatch.pes.edu",
            srn: "PES2UG24CS102",
            department: "ECE",
            semester: 4,
            onboardingCompleted: true,
          },
        },
      },
      include: { student: true },
    });
    student2Session = {
      id: stu2Acc.userId,
      userId: stu2Acc.userId,
      email: stu2Acc.email,
      fullName: stu2Acc.fullName,
      role: "STUDENT",
      studentId: stu2Acc.student!.studentId,
    };

    // Seed all 25 interests & 8 categories + all 41 PESU EC Campus clubs idempotently
    for (const item of SEED_INTERESTS) {
      await prisma.interest.upsert({
        where: { slug: slugify(item.name) },
        update: { name: item.name, category: item.category },
        create: {
          name: item.name,
          slug: slugify(item.name),
          category: item.category,
          description: item.description,
          iconName: item.iconName,
        },
      });
    }

    for (const cat of SEED_EVENT_CATEGORIES) {
      const record = await prisma.eventCategory.upsert({
        where: { slug: slugify(cat.name) },
        update: { name: cat.name },
        create: { name: cat.name, slug: slugify(cat.name), description: cat.description },
      });
      if (cat.name === "Technical") {
        techCategoryId = record.categoryId;
      }
    }

    for (let pass = 0; pass < 2; pass++) {
      for (const [idx, c] of SEED_CLUBS.entries()) {
        const club = await prisma.club.upsert({
          where: { slug: slugify(c.name) },
          update: { name: c.name, category: c.category },
          create: {
            name: c.name,
            slug: slugify(c.name),
            category: c.category,
            campus: "PES University EC Campus",
            tagline: c.tagline,
            description: c.description,
            activities: c.activities,
            isSampleDescription: true,
            status: "ACTIVE",
            isFeatured: Boolean(c.isFeatured),
            memberCount: 25 + idx,
            adminId: adminSession.adminId!,
          },
        });
        if (c.name === "NeuralHive") neuralClubId = club.clubId;
        if (c.name === "Terpsichore") danceClubId = club.clubId;
      }
    }

    const pendingClub = await prisma.club.create({
      data: {
        name: "Pending Quantum Society",
        slug: "pending-quantum-society",
        category: "TECHNICAL",
        description: "Proposed quantum computing student club pending admin review.",
        activities: "Weekly quantum circuits study group",
        status: "PENDING",
        adminId: adminSession.adminId!,
      },
    });
    pendingClubId = pendingClub.clubId;

    await prisma.clubCoordinatorAssignment.create({
      data: {
        coordinatorId: assignedCoordSession.coordinatorId!,
        clubId: neuralClubId,
        title: "Club Lead",
        assignedByAdminId: adminSession.adminId!,
      },
    });

    const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const deadlineDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const ev = await prisma.event.create({
      data: {
        title: "Single-Seat AI Workshop",
        slug: "single-seat-ai-workshop",
        description: "Hands-on LLM and pgvector session with strict 1-seat capacity.",
        clubId: neuralClubId,
        categoryId: techCategoryId,
        eventDate,
        registrationDeadline: deadlineDate,
        startTime: "15:00",
        endTime: "17:00",
        venue: "EC Campus Lab 1",
        maxCapacity: 1,
        status: "UPCOMING",
      },
    });
    oneSeatEventId = ev.eventId;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await socketServer?.stop();
    await db?.close();
  });

  beforeEach(() => {
    authState.user = null;
  });

  it("seeds all 41 PESU ECC clubs, 25 interests, and 8 event categories idempotently", async () => {
    const [clubCount, interestCount, catCount] = await Promise.all([
      prisma.club.count({ where: { status: "ACTIVE" } }),
      prisma.interest.count(),
      prisma.eventCategory.count(),
    ]);
    expect(clubCount).toBe(41);
    expect(interestCount).toBe(25);
    expect(catCount).toBe(8);
  });

  it("hides PENDING clubs from public and students but allows ADMIN access", async () => {
    const unauthRes = await clubDetailRoute.GET(
      makeReq(`http://localhost/api/clubs/${pendingClubId}`, "GET"),
      { params: Promise.resolve({ id: pendingClubId }) }
    );
    expect(unauthRes.status).toBe(404);

    authState.user = student1Session;
    const stuRes = await clubDetailRoute.GET(
      makeReq(`http://localhost/api/clubs/${pendingClubId}`, "GET"),
      { params: Promise.resolve({ id: pendingClubId }) }
    );
    expect(stuRes.status).toBe(404);

    authState.user = adminSession;
    const adminRes = await clubDetailRoute.GET(
      makeReq(`http://localhost/api/clubs/${pendingClubId}`, "GET"),
      { params: Promise.resolve({ id: pendingClubId }) }
    );
    expect(adminRes.status).toBe(200);
  });

  it("allows students to join and leave an active club atomically with memberCount updates", async () => {
    const initialClub = await prisma.club.findUniqueOrThrow({ where: { clubId: neuralClubId } });
    authState.user = student1Session;

    const joinRes = await membershipRoute.POST(
      makeReq(`http://localhost/api/clubs/${neuralClubId}/membership`, "POST"),
      { params: Promise.resolve({ id: neuralClubId }) }
    );
    expect(joinRes.status).toBe(201);
    const joinBody = await joinRes.json();
    expect(joinBody.memberCount).toBe(initialClub.memberCount + 1);

    // Idempotent duplicate join returns 200 without double-incrementing memberCount
    const dupRes = await membershipRoute.POST(
      makeReq(`http://localhost/api/clubs/${neuralClubId}/membership`, "POST"),
      { params: Promise.resolve({ id: neuralClubId }) }
    );
    expect(dupRes.status).toBe(200);
    const dupBody = await dupRes.json();
    expect(dupBody.memberCount).toBe(initialClub.memberCount + 1);

    // Leave
    const leaveRes = await membershipRoute.DELETE(
      makeReq(`http://localhost/api/clubs/${neuralClubId}/membership`, "DELETE"),
      { params: Promise.resolve({ id: neuralClubId }) }
    );
    expect(leaveRes.status).toBe(200);
    const leaveBody = await leaveRes.json();
    expect(leaveBody.memberCount).toBe(initialClub.memberCount);
  });

  it("prevents overbooking when two students concurrently register for a 1-seat event and supports cancel/re-register", async () => {
    const registerAs = async (sessionUser: MockSessionUser) => {
      authState.user = sessionUser;
      return eventRegisterRoute.POST(
        makeReq(`http://localhost/api/events/${oneSeatEventId}/register`, "POST"),
        { params: Promise.resolve({ id: oneSeatEventId }) }
      );
    };

    const res1 = registerAs(student1Session);
    const res2 = registerAs(student2Session);
    const [r1, r2] = await Promise.all([res1, res2]);
    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);

    const updatedEvent = await prisma.event.findUniqueOrThrow({ where: { eventId: oneSeatEventId } });
    expect(updatedEvent.currentRegistrations).toBe(1);

    // Identify winner & cancel
    const winner = r1.status === 201 ? student1Session : student2Session;
    const loser = r1.status === 201 ? student2Session : student1Session;

    // Winner tries duplicate
    authState.user = winner;
    const dupRes = await eventRegisterRoute.POST(
      makeReq(`http://localhost/api/events/${oneSeatEventId}/register`, "POST"),
      { params: Promise.resolve({ id: oneSeatEventId }) }
    );
    expect(dupRes.status).toBe(409);

    // Winner cancels
    const cancelRes = await eventRegisterRoute.DELETE(
      makeReq(`http://localhost/api/events/${oneSeatEventId}/register`, "DELETE"),
      { params: Promise.resolve({ id: oneSeatEventId }) }
    );
    expect(cancelRes.status).toBe(200);

    // Now loser registers cleanly
    authState.user = loser;
    const loserRes = await eventRegisterRoute.POST(
      makeReq(`http://localhost/api/events/${oneSeatEventId}/register`, "POST"),
      { params: Promise.resolve({ id: oneSeatEventId }) }
    );
    expect(loserRes.status).toBe(201);
  });

  it("enforces coordinator club-scoping RBAC and admin DB showcase views", async () => {
    // Student cannot create event
    authState.user = student1Session;
    const stuCreateEv = await eventsRoute.POST(
      makeReq("http://localhost/api/events", "POST", {
        title: "Unauthorized Event",
        description: "Should fail because students cannot create events.",
        clubId: neuralClubId,
        categoryId: techCategoryId,
        eventDate: new Date(Date.now() + 86400000 * 4).toISOString(),
        registrationDeadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        startTime: "10:00",
        endTime: "12:00",
        venue: "Room 101",
        maxCapacity: 50,
      })
    );
    expect(stuCreateEv.status).toBe(403);

    // Unassigned coordinator cannot edit or create event for NeuralHive
    authState.user = unassignedCoordSession;
    const unauthCoordEv = await eventsRoute.POST(
      makeReq("http://localhost/api/events", "POST", {
        title: "Unassigned Coord Event",
        description: "Should fail because coordinator is not assigned to this club.",
        clubId: neuralClubId,
        categoryId: techCategoryId,
        eventDate: new Date(Date.now() + 86400000 * 4).toISOString(),
        registrationDeadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        startTime: "10:00",
        endTime: "12:00",
        venue: "Room 101",
        maxCapacity: 50,
      })
    );
    expect(unauthCoordEv.status).toBe(403);

    // Assigned coordinator succeeds
    authState.user = assignedCoordSession;
    const coordEv = await eventsRoute.POST(
      makeReq("http://localhost/api/events", "POST", {
        title: "Assigned Coordinator Seminar",
        description: "Coordinator-created technical workshop on neural networks.",
        clubId: neuralClubId,
        categoryId: techCategoryId,
        eventDate: new Date(Date.now() + 86400000 * 4).toISOString(),
        registrationDeadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        startTime: "14:00",
        endTime: "16:00",
        venue: "EC Campus Auditorium",
        maxCapacity: 100,
      })
    );
    expect(coordEv.status).toBe(201);

    // DB showcase denied for student, allowed for admin
    authState.user = student1Session;
    const stuShowcase = await dbShowcaseRoute.GET();
    expect(stuShowcase.status).toBe(403);

    authState.user = adminSession;
    const adminShowcase = await dbShowcaseRoute.GET();
    expect(adminShowcase.status).toBe(200);
    const showcaseJson = await adminShowcase.json();
    expect(showcaseJson.metadata.hasPgvector).toBe(true);
    expect(showcaseJson.popularClubsView.length).toBeGreaterThan(0);
    expect(showcaseJson.eventStatsView.length).toBeGreaterThan(0);
    expect(showcaseJson.clubEventSummaryView.length).toBeGreaterThan(0);
    expect(showcaseJson.studentSummaryView.length).toBeGreaterThan(0);
  });

  it("reports semantic search unavailable when embeddings are null and ranks pgvector cosine similarity when embeddings exist", async () => {
    const noVecResult = await semanticSearchCatalog("artificial intelligence", 5);
    expect(noVecResult.semanticAvailable).toBe(false);
    expect(noVecResult.mode).toBe("unavailable");

    // Store synthetic 768-dim vectors directly for NeuralHive & Terpsichore to verify pgvector SQL operator <=>
    const aiVec = new Array(768).fill(0);
    aiVec[0] = 1;
    aiVec[1] = 0.2;
    const danceVec = new Array(768).fill(0);
    danceVec[2] = 1;

    const toSql = (v: number[]) => `[${v.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE clubs SET embedding = $1::vector WHERE club_id = $2`,
      toSql(aiVec),
      neuralClubId
    );
    await prisma.$executeRawUnsafe(
      `UPDATE clubs SET embedding = $1::vector WHERE club_id = $2`,
      toSql(danceVec),
      danceClubId
    );

    const ranked = await prisma.$queryRawUnsafe<
      Array<{ club_id: string; name: string; similarity: number }>
    >(
      `SELECT club_id, name, ROUND((1 - (embedding <=> $1::vector))::numeric, 4)::float AS similarity
       FROM clubs
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector ASC`,
      toSql(aiVec)
    );

    expect(ranked[0].name).toBe("NeuralHive");
    expect(ranked[0].similarity).toBeGreaterThan(ranked[1].similarity);
  });
});
