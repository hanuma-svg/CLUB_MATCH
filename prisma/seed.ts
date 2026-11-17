import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { SEED_CLUBS, SEED_EVENT_CATEGORIES, SEED_INTERESTS } from "./seed-data";
import { slugify } from "../lib/slug";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ClubMatch PostgreSQL database...");

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@clubmatch.pes.edu").toLowerCase();
  const adminPass = process.env.SEED_ADMIN_PASSWORD || "Admin@ClubMatch2026!";
  const coordPass = process.env.SEED_COORDINATOR_PASSWORD || "Coord@ClubMatch2026!";
  const studentPass = process.env.SEED_STUDENT_PASSWORD || "Student@ClubMatch2026!";

  const [adminHash, coordHash, studentHash] = await Promise.all([
    bcrypt.hash(adminPass, 12),
    bcrypt.hash(coordPass, 12),
    bcrypt.hash(studentPass, 12),
  ]);

  // 1. Seed Admin
  const adminUser = await prisma.userAccount.upsert({
    where: { email: adminEmail },
    update: { fullName: "Dr. Campus Admin", role: "ADMIN", isActive: true },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      fullName: "Dr. Campus Admin",
      role: "ADMIN",
      admin: {
        create: {
          email: adminEmail,
          designation: "Faculty & Platform Administrator",
        },
      },
    },
    include: { admin: true },
  });

  const adminRecord =
    adminUser.admin ??
    (await prisma.admin.upsert({
      where: { userId: adminUser.userId },
      update: {},
      create: {
        userId: adminUser.userId,
        email: adminEmail,
        designation: "Faculty & Platform Administrator",
      },
    }));

  // 2. Seed Interests (25 across 4 categories)
  const interestMap = new Map<string, string>();
  for (const item of SEED_INTERESTS) {
    const slug = slugify(item.name);
    const interest = await prisma.interest.upsert({
      where: { slug },
      update: {
        name: item.name,
        category: item.category,
        description: item.description,
        iconName: item.iconName,
      },
      create: {
        name: item.name,
        slug,
        category: item.category,
        description: item.description,
        iconName: item.iconName,
      },
    });
    interestMap.set(item.name, interest.interestId);
  }

  // 3. Seed Event Categories
  const categoryMap = new Map<string, string>();
  for (const cat of SEED_EVENT_CATEGORIES) {
    const slug = slugify(cat.name);
    const record = await prisma.eventCategory.upsert({
      where: { slug },
      update: { name: cat.name, description: cat.description },
      create: { name: cat.name, slug, description: cat.description },
    });
    categoryMap.set(cat.name, record.categoryId);
  }

  // 4. Seed All 41 PESU EC Campus Clubs & Research Centers
  const clubMap = new Map<string, string>();
  for (const [idx, clubData] of SEED_CLUBS.entries()) {
    const slug = slugify(clubData.name);
    const club = await prisma.club.upsert({
      where: { slug },
      update: {
        name: clubData.name,
        category: clubData.category,
        tagline: clubData.tagline,
        description: clubData.description,
        activities: clubData.activities,
        isFeatured: Boolean(clubData.isFeatured),
        isSampleDescription: true,
        adminId: adminRecord.adminId,
      },
      create: {
        name: clubData.name,
        slug,
        category: clubData.category,
        campus: "PES University EC Campus",
        tagline: clubData.tagline,
        description: clubData.description,
        activities: clubData.activities,
        isSampleDescription: true,
        verifiedCoordinatorName: null,
        verifiedEmail: null,
        verifiedSocialLinks: undefined,
        status: "ACTIVE",
        isFeatured: Boolean(clubData.isFeatured),
        memberCount: 25 + ((idx * 17) % 95),
        adminId: adminRecord.adminId,
      },
    });
    clubMap.set(clubData.name, club.clubId);

    for (const interestName of clubData.interestNames) {
      const interestId = interestMap.get(interestName);
      if (interestId) {
        await prisma.clubInterest.upsert({
          where: { clubId_interestId: { clubId: club.clubId, interestId } },
          update: {},
          create: { clubId: club.clubId, interestId, weight: 2 },
        });
      }
    }
  }

  // 5. Seed Sample Club Coordinator assigned to HSP & NeuralHive
  const coordEmail = "coordinator@clubmatch.pes.edu";
  const coordUser = await prisma.userAccount.upsert({
    where: { email: coordEmail },
    update: { fullName: "Sample Club Coordinator", role: "CLUB_COORDINATOR", isActive: true },
    create: {
      email: coordEmail,
      passwordHash: coordHash,
      fullName: "Sample Club Coordinator",
      role: "CLUB_COORDINATOR",
      clubCoordinator: {
        create: {
          email: coordEmail,
          department: "Computer Science & Engineering",
        },
      },
    },
    include: { clubCoordinator: true },
  });

  const coordinator =
    coordUser.clubCoordinator ??
    (await prisma.clubCoordinator.upsert({
      where: { userId: coordUser.userId },
      update: {},
      create: {
        userId: coordUser.userId,
        email: coordEmail,
        department: "Computer Science & Engineering",
      },
    }));

  for (const assignedClubName of ["HSP (formerly HackerSpace)", "NeuralHive"]) {
    const clubId = clubMap.get(assignedClubName);
    if (clubId) {
      await prisma.clubCoordinatorAssignment.upsert({
        where: { coordinatorId_clubId: { coordinatorId: coordinator.coordinatorId, clubId } },
        update: {},
        create: {
          coordinatorId: coordinator.coordinatorId,
          clubId,
          assignedByAdminId: adminRecord.adminId,
          title: "Sample Demo Coordinator",
        },
      });
    }
  }

  // 6. Seed Sample Student with Interests
  const studentEmail = "student@clubmatch.pes.edu";
  const studentUser = await prisma.userAccount.upsert({
    where: { email: studentEmail },
    update: { fullName: "Ananya Rao (Sample Student)", role: "STUDENT", isActive: true },
    create: {
      email: studentEmail,
      passwordHash: studentHash,
      fullName: "Ananya Rao (Sample Student)",
      role: "STUDENT",
      student: {
        create: {
          email: studentEmail,
          srn: "PES2UG24CS001",
          department: "CSE",
          semester: 4,
          campus: "PES University EC Campus",
          bio: "Sample student interested in AI, cybersecurity, open-source web engineering, and design.",
          onboardingCompleted: true,
        },
      },
    },
    include: { student: true },
  });

  const student =
    studentUser.student ??
    (await prisma.student.upsert({
      where: { userId: studentUser.userId },
      update: {},
      create: {
        userId: studentUser.userId,
        email: studentEmail,
        srn: "PES2UG24CS001",
        department: "CSE",
        semester: 4,
        onboardingCompleted: true,
      },
    }));

  const sampleStudentInterests = [
    "Coding and Programming",
    "Artificial Intelligence",
    "Web Development",
    "Cybersecurity",
    "Graphic Design",
  ];
  for (const name of sampleStudentInterests) {
    const interestId = interestMap.get(name);
    if (interestId) {
      await prisma.studentInterest.upsert({
        where: { studentId_interestId: { studentId: student.studentId, interestId } },
        update: {},
        create: { studentId: student.studentId, interestId },
      });
    }
  }

  // 7. Seed Sample Upcoming Events (explicitly flagged isSampleEvent=true)
  const daysFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const sampleEvents = [
    {
      title: "Sample Event: Open Source Sprint & Linux Lab",
      clubName: "HSP (formerly HackerSpace)",
      categoryName: "Workshops",
      description:
        "Sample event for academic demonstration: Hands-on Git workflows, containerization, and contributing to campus open-source repositories.",
      daysAhead: 5,
      deadlineDaysAhead: 4,
      startTime: "14:00",
      endTime: "17:00",
      venue: "EC Campus Seminar Hall 1",
      maxCapacity: 80,
      isFeatured: true,
    },
    {
      title: "Sample Event: NeuralHive GenAI & Vector Search Bootcamp",
      clubName: "NeuralHive",
      categoryName: "Technical",
      description:
        "Sample event for academic demonstration: Building semantic retrieval pipelines using embeddings, cosine similarity, and PostgreSQL pgvector.",
      daysAhead: 8,
      deadlineDaysAhead: 7,
      startTime: "15:00",
      endTime: "18:00",
      venue: "MRD Block Auditorium",
      maxCapacity: 120,
      isFeatured: true,
    },
    {
      title: "Sample Event: Layer8 Campus CTF Qualifier",
      clubName: "Layer8",
      categoryName: "Competitions",
      description:
        "Sample event for academic demonstration: Capture The Flag challenge covering web exploitation, forensics, OSINT, and cryptography.",
      daysAhead: 12,
      deadlineDaysAhead: 10,
      startTime: "10:00",
      endTime: "16:00",
      venue: "Cyber Lab, 3rd Floor",
      maxCapacity: 60,
      isFeatured: true,
    },
    {
      title: "Sample Event: EC Campus 24-Hour Buildathon",
      clubName: "Google Developer Student Club",
      categoryName: "Hackathons",
      description:
        "Sample event for academic demonstration: Team-based 24-hour product engineering hackathon solving campus and sustainability problems.",
      daysAhead: 16,
      deadlineDaysAhead: 14,
      startTime: "09:00",
      endTime: "09:00",
      venue: "EC Campus Innovation Atrium",
      maxCapacity: 150,
      isFeatured: true,
    },
    {
      title: "Sample Event: Figma to Design System Studio",
      clubName: "DSGNR",
      categoryName: "Workshops",
      description:
        "Sample event for academic demonstration: Learn component tokens, accessible typography, and responsive prototyping.",
      daysAhead: 10,
      deadlineDaysAhead: 9,
      startTime: "16:00",
      endTime: "18:00",
      venue: "Design Studio B204",
      maxCapacity: 50,
      isFeatured: false,
    },
    {
      title: "Sample Event: E-Cell Ideathon & Pitch Night",
      clubName: "The Entrepreneurship Club",
      categoryName: "Entrepreneurship",
      description:
        "Sample event for academic demonstration: Pitch early-stage campus startup ideas to mentors and peers in a 5-minute rapid-fire format.",
      daysAhead: 14,
      deadlineDaysAhead: 12,
      startTime: "15:30",
      endTime: "18:30",
      venue: "EC Seminar Hall 2",
      maxCapacity: 90,
      isFeatured: false,
    },
    {
      title: "Sample Event: Rhythms & Cyphers Cultural Showcase",
      clubName: "Terpsichore",
      categoryName: "Cultural",
      description:
        "Sample event for academic demonstration: Collaborative choreography showcase, freestyle dance circle, and acoustic performances.",
      daysAhead: 19,
      deadlineDaysAhead: 17,
      startTime: "17:00",
      endTime: "20:00",
      venue: "Open Air Amphitheatre",
      maxCapacity: 250,
      isFeatured: true,
    },
    {
      title: "Sample Event: C3I Undergraduate NLP Research Colloquium",
      clubName: "C3I",
      categoryName: "Seminars",
      description:
        "Sample event for academic demonstration: Overview of current cognitive computing and natural language research opportunities for undergraduates.",
      daysAhead: 21,
      deadlineDaysAhead: 19,
      startTime: "14:00",
      endTime: "16:00",
      venue: "C3I Research Lab Wing",
      maxCapacity: 45,
      isFeatured: false,
    },
  ];

  const createdEvents: string[] = [];
  for (const ev of sampleEvents) {
    const clubId = clubMap.get(ev.clubName);
    const categoryId = categoryMap.get(ev.categoryName);
    if (!clubId || !categoryId) continue;
    const slug = slugify(ev.title);
    const event = await prisma.event.upsert({
      where: { slug },
      update: {
        title: ev.title,
        description: ev.description,
        eventDate: daysFromNow(ev.daysAhead),
        registrationDeadline: daysFromNow(ev.deadlineDaysAhead),
        maxCapacity: ev.maxCapacity,
        isFeatured: ev.isFeatured,
        isSampleEvent: true,
      },
      create: {
        slug,
        title: ev.title,
        description: ev.description,
        clubId,
        categoryId,
        eventDate: daysFromNow(ev.daysAhead),
        startTime: ev.startTime,
        endTime: ev.endTime,
        venue: ev.venue,
        registrationDeadline: daysFromNow(ev.deadlineDaysAhead),
        maxCapacity: ev.maxCapacity,
        currentRegistrations: 0,
        status: "UPCOMING",
        isFeatured: ev.isFeatured,
        isSampleEvent: true,
      },
    });
    createdEvents.push(event.eventId);
  }

  // 8. Sample Bookmark + Registration for Demo Student
  const hspId = clubMap.get("HSP (formerly HackerSpace)");
  const neuralId = clubMap.get("NeuralHive");
  if (hspId) {
    await prisma.bookmarkedClub.upsert({
      where: { studentId_clubId: { studentId: student.studentId, clubId: hspId } },
      update: {},
      create: { studentId: student.studentId, clubId: hspId },
    });
  }
  if (neuralId) {
    await prisma.bookmarkedClub.upsert({
      where: { studentId_clubId: { studentId: student.studentId, clubId: neuralId } },
      update: {},
      create: { studentId: student.studentId, clubId: neuralId },
    });
  }

  if (createdEvents[0]) {
    const existingReg = await prisma.eventRegistration.findUnique({
      where: { studentId_eventId: { studentId: student.studentId, eventId: createdEvents[0] } },
    });
    if (!existingReg) {
      await prisma.$transaction(async (tx) => {
        await tx.eventRegistration.create({
          data: {
            studentId: student.studentId,
            eventId: createdEvents[0],
            status: "REGISTERED",
          },
        });
        await tx.event.update({
          where: { eventId: createdEvents[0] },
          data: { currentRegistrations: 1 },
        });
      });
    }
  }

  console.log(
    `Seed complete: ${SEED_INTERESTS.length} interests, ${SEED_EVENT_CATEGORIES.length} event categories, ${SEED_CLUBS.length} PESU ECC clubs & research centers, ${sampleEvents.length} sample events.`
  );
  console.log(`Demo accounts -> Admin: ${adminEmail} | Coordinator: ${coordEmail} | Student: ${studentEmail}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
