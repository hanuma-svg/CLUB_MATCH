import { prisma } from "../lib/prisma";
import { getEmbeddingStatus } from "../lib/embeddings";
import { syncClubEmbedding, syncEventEmbedding, syncStudentEmbedding } from "../lib/recommendations";

async function run() {
  const status = getEmbeddingStatus();
  if (!status.configured) {
    console.error("Cannot generate embeddings:", status.reason);
    process.exit(1);
  }

  console.log(`Generating 768-d embeddings using ${status.provider} (${status.model})...`);

  const clubs = await prisma.club.findMany({ select: { clubId: true, name: true } });
  let clubOk = 0;
  for (const club of clubs) {
    const res = await syncClubEmbedding(club.clubId);
    if (res.synced) clubOk++;
    else console.warn(`Club ${club.name} skipped: ${res.reason}`);
  }

  const events = await prisma.event.findMany({ select: { eventId: true, title: true } });
  let eventOk = 0;
  for (const ev of events) {
    const res = await syncEventEmbedding(ev.eventId);
    if (res.synced) eventOk++;
    else console.warn(`Event ${ev.title} skipped: ${res.reason}`);
  }

  const students = await prisma.student.findMany({ select: { studentId: true, email: true } });
  let studentOk = 0;
  for (const s of students) {
    const res = await syncStudentEmbedding(s.studentId);
    if (res.synced) studentOk++;
  }

  console.log(`Done. Synced embeddings -> Clubs: ${clubOk}/${clubs.length}, Events: ${eventOk}/${events.length}, Students: ${studentOk}/${students.length}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
