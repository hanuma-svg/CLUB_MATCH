import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import {
  createClubSchema,
  createEventSchema,
  registerSchema,
  updateUserRoleSchema,
} from "../lib/validations";
import { formatVectorLiteral, generateEmbedding, getEmbeddingStatus } from "../lib/embeddings";
import { slugify } from "../lib/slug";

describe("Security, Validation & Embeddings Integrity Tests", () => {
  it("validates student registration and rejects weak passwords", () => {
    const weak = registerSchema.safeParse({
      fullName: "Test Student",
      email: "test@pes.edu",
      password: "weak",
    });
    expect(weak.success).toBe(false);

    const strong = registerSchema.safeParse({
      fullName: "Test Student",
      email: "TEST@PES.EDU",
      password: "StrongPass123",
      semester: 4,
    });
    expect(strong.success).toBe(true);
    if (strong.success) {
      expect(strong.data.email).toBe("test@pes.edu");
    }
  });

  it("hashes passwords securely with bcrypt and verifies match", async () => {
    const hash = await bcrypt.hash("Student@2026!", 10);
    expect(hash).not.toBe("Student@2026!");
    expect(await bcrypt.compare("Student@2026!", hash)).toBe(true);
    expect(await bcrypt.compare("WrongPass", hash)).toBe(false);
  });

  it("rejects event registration deadline later than event date", () => {
    const invalid = createEventSchema.safeParse({
      title: "Invalid Deadline Event",
      description: "Testing validation rule",
      clubId: "club_1",
      categoryId: "cat_1",
      eventDate: "2026-12-01T10:00:00.000Z",
      registrationDeadline: "2026-12-05T10:00:00.000Z",
      startTime: "10:00",
      endTime: "12:00",
      venue: "Auditorium",
      maxCapacity: 50,
    });
    expect(invalid.success).toBe(false);
  });

  it("validates club category enums and rejects invalid role escalations", () => {
    expect(
      createClubSchema.safeParse({
        name: "Test Club",
        category: "INVALID_CAT",
        description: "A valid length description",
        activities: "Workshops and talks",
      }).success
    ).toBe(false);

    expect(
      updateUserRoleSchema.safeParse({
        role: "SUPERUSER",
      }).success
    ).toBe(false);
  });

  it("never generates fake embeddings when no embedding API key is configured", async () => {
    const prevGemini = process.env.GEMINI_API_KEY;
    const prevOpenAI = process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const status = getEmbeddingStatus();
    expect(status.configured).toBe(false);

    const res = await generateEmbedding("Artificial Intelligence and Robotics");
    expect(res.available).toBe(false);
    expect(res.embedding).toBeNull();

    if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
    if (prevOpenAI) process.env.OPENAI_API_KEY = prevOpenAI;
  });

  it("rejects non-finite vector coordinates and wrong dimensions to prevent SQL injection", () => {
    expect(() => formatVectorLiteral([1, 2, 3])).toThrow();
    const bad = new Array(768).fill(0);
    bad[5] = Number.NaN;
    expect(() => formatVectorLiteral(bad)).toThrow();

    const good = new Array(768).fill(0.5);
    const literal = formatVectorLiteral(good);
    expect(literal.startsWith("[0.50000000,")).toBe(true);
    expect(literal.endsWith("]")).toBe(true);
  });

  it("produces URL-safe slugs", () => {
    expect(slugify("HSP (formerly HackerSpace)")).toBe("hsp-formerly-hackerspace");
    expect(slugify("IOT Maker's Space")).toBe("iot-makers-space");
  });
});
