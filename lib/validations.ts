import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  srn: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  department: z.string().trim().max(80).optional().or(z.literal("")),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  campus: z.string().trim().max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  srn: z.string().trim().max(30).nullable().optional(),
  department: z.string().trim().max(80).nullable().optional(),
  semester: z.coerce.number().int().min(1).max(8).nullable().optional(),
  campus: z.string().trim().min(2).max(120).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
});

export const updateInterestsSchema = z.object({
  interestIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one interest")
    .max(25),
});

export const createClubSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(["TECHNICAL", "NON_TECHNICAL", "CULTURAL", "RESEARCH_CENTER"]),
  campus: z.string().trim().min(2).max(120).default("PES University EC Campus"),
  tagline: z.string().trim().max(180).optional().nullable(),
  description: z.string().trim().min(10).max(2000),
  activities: z.string().trim().min(5).max(1500),
  logoUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  bannerUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  isSampleDescription: z.boolean().optional(),
  verifiedCoordinatorName: z.string().trim().max(120).optional().nullable(),
  verifiedEmail: z.string().trim().email().optional().nullable().or(z.literal("")),
  isFeatured: z.boolean().optional(),
  interestIds: z.array(z.string().min(1)).optional(),
});

export const updateClubSchema = createClubSchema.partial().extend({
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "REJECTED"]).optional(),
});

export const createEventSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(10).max(3000),
    clubId: z.string().min(1),
    categoryId: z.string().min(1),
    eventDate: z.string().datetime({ offset: true }).or(z.string().min(8)),
    startTime: z.string().trim().min(2).max(20),
    endTime: z.string().trim().min(2).max(20),
    venue: z.string().trim().min(2).max(150),
    registrationDeadline: z.string().datetime({ offset: true }).or(z.string().min(8)),
    maxCapacity: z.coerce.number().int().min(1).max(5000),
    bannerUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
    isFeatured: z.boolean().optional(),
    isSampleEvent: z.boolean().optional(),
  })
  .refine(
    (data) => new Date(data.registrationDeadline).getTime() <= new Date(data.eventDate).getTime(),
    {
      message: "Registration deadline must be on or before the event date",
      path: ["registrationDeadline"],
    }
  );

export const updateEventSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().min(10).max(3000).optional(),
  categoryId: z.string().min(1).optional(),
  eventDate: z.string().min(8).optional(),
  startTime: z.string().trim().min(2).max(20).optional(),
  endTime: z.string().trim().min(2).max(20).optional(),
  venue: z.string().trim().min(2).max(150).optional(),
  registrationDeadline: z.string().min(8).optional(),
  maxCapacity: z.coerce.number().int().min(1).max(5000).optional(),
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
  isFeatured: z.boolean().optional(),
});

export const assignCoordinatorSchema = z.object({
  coordinatorId: z.string().min(1),
  clubId: z.string().min(1),
  title: z.string().trim().min(2).max(80).default("Club Coordinator"),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["STUDENT", "CLUB_COORDINATOR", "ADMIN"]),
  isActive: z.boolean().optional(),
});

export const createInterestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.enum(["TECHNOLOGY", "CREATIVE", "CULTURAL", "OTHER"]),
  description: z.string().trim().max(300).optional().nullable(),
  iconName: z.string().trim().max(50).optional().nullable(),
});
