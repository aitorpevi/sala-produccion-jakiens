import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";

const TOKEN_TTL_DAYS = 45;

export function generateTokenString() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function issueAccessToken(projectMemberId: string) {
  const token = generateTokenString();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.accessToken.create({
    data: { projectMemberId, token, expiresAt },
  });
  return token;
}

export async function resolveAccessToken(token: string) {
  const record = await db.accessToken.findUnique({
    where: { token },
    include: {
      projectMember: {
        include: { project: true, person: true },
      },
    },
  });
  if (!record) return null;
  if (record.expiresAt < new Date()) return null;
  return record.projectMember;
}

export async function getOrCreateActiveToken(projectMemberId: string) {
  const existing = await db.accessToken.findFirst({
    where: { projectMemberId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing.token;
  return issueAccessToken(projectMemberId);
}
