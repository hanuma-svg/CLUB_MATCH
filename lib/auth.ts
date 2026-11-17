import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      role: UserRole;
      fullName: string;
      studentId: string | null;
      coordinatorId: string | null;
      adminId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    userId: string;
    role: UserRole;
    fullName: string;
    studentId: string | null;
    coordinatorId: string | null;
    adminId: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV !== "production" ? "clubmatch-dev-secret-change-in-production" : undefined),
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const user = await prisma.userAccount.findUnique({
          where: { email },
          include: {
            student: { select: { studentId: true } },
            clubCoordinator: { select: { coordinatorId: true } },
            admin: { select: { adminId: true } },
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.userId,
          userId: user.userId,
          email: user.email,
          name: user.fullName,
          fullName: user.fullName,
          role: user.role,
          studentId: user.student?.studentId ?? null,
          coordinatorId: user.clubCoordinator?.coordinatorId ?? null,
          adminId: user.admin?.adminId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.userId;
        token.role = user.role;
        token.fullName = user.fullName;
        token.studentId = user.studentId;
        token.coordinatorId = user.coordinatorId;
        token.adminId = user.adminId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.userId = String(token.userId || "");
        session.user.role = token.role as UserRole;
        session.user.fullName = String(token.fullName || session.user.name || "");
        session.user.studentId = (token.studentId as string | null) ?? null;
        session.user.coordinatorId = (token.coordinatorId as string | null) ?? null;
        session.user.adminId = (token.adminId as string | null) ?? null;
      }
      return session;
    },
  },
});
