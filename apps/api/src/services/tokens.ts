import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

export interface JwtUserPayload {
  userId: string;
  phone: string;
  roles: string[];
}

export function generateAccessToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
}

export async function createRefreshToken(userId: string, userAgent?: string, ip?: string): Promise<string> {
  const rawToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ip,
    },
  });

  return rawToken;
}

export async function rotateRefreshToken(
  rawToken: string,
  userAgent?: string,
  ip?: string
): Promise<{ accessToken: string; newRefreshToken: string; user: any }> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { sellerProfile: true } } },
  });

  if (!record || record.revokedAt || new Date() > record.expiresAt) {
    const error: any = new Error("Invalid or expired session. Please log in again.");
    error.statusCode = 401;
    error.code = "INVALID_REFRESH_TOKEN";
    throw error;
  }

  if (record.user.isBanned) {
    const error: any = new Error("This account has been suspended.");
    error.statusCode = 403;
    error.code = "ACCOUNT_BANNED";
    throw error;
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  // Issue new token pair
  const roles = record.user.roles.split(",").map((r: string) => r.trim());
  const accessToken = generateAccessToken({
    userId: record.user.id,
    phone: record.user.phone,
    roles,
  });

  const newRefreshToken = await createRefreshToken(record.user.id, userAgent, ip);

  return {
    accessToken,
    newRefreshToken,
    user: record.user,
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function setRefreshTokenCookie(res: Response, rawToken: string) {
  res.cookie("refreshToken", rawToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/api/v1/auth",
  });
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
  });
}
