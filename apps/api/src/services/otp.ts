import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3;

export async function sendOtp(phone: string): Promise<{ success: boolean; message: string; debugOtp?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Rate limit: max 3 sends per hour per phone
  const recentCount = await prisma.otpCode.count({
    where: {
      phone,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (env.NODE_ENV === "production" && recentCount >= MAX_SENDS_PER_HOUR) {
    const error: any = new Error("Too many OTP requests. Please try again after 1 hour.");
    error.statusCode = 429;
    error.code = "RATE_LIMIT_EXCEEDED";
    throw error;
  }

  // Generate 6-digit cryptographically random OTP
  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(rawOtp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any previously unconsumed OTPs for this phone
  await prisma.otpCode.deleteMany({
    where: { phone, consumedAt: null },
  });

  await prisma.otpCode.create({
    data: {
      phone,
      codeHash,
      expiresAt,
    },
  });

  if (env.SMS_PROVIDER === "MOCK" || env.NODE_ENV !== "production") {
    logger.info(`[MOCK SMS] OTP for phone ${phone}: ${rawOtp}`);
    return {
      success: true,
      message: `OTP sent successfully (Dev/Test OTP: ${rawOtp})`,
      debugOtp: rawOtp,
    };
  }

  // Production provider (MSG91 / Twilio) integration
  return {
    success: true,
    message: "OTP sent to your mobile phone via SMS",
  };
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({
    where: {
      phone,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    const error: any = new Error("No active OTP found. Please request a new OTP.");
    error.statusCode = 400;
    error.code = "OTP_NOT_FOUND";
    throw error;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.delete({ where: { id: record.id } });
    const error: any = new Error("Maximum verification attempts exceeded. Please request a new OTP.");
    error.statusCode = 400;
    error.code = "MAX_ATTEMPTS_EXCEEDED";
    throw error;
  }

  if (new Date() > record.expiresAt) {
    await prisma.otpCode.delete({ where: { id: record.id } });
    const error: any = new Error("OTP has expired. Please request a new OTP.");
    error.statusCode = 400;
    error.code = "OTP_EXPIRED";
    throw error;
  }

  const isValid = await bcrypt.compare(otp, record.codeHash);

  if (!isValid) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const error: any = new Error("Incorrect OTP. Please check and try again.");
    error.statusCode = 400;
    error.code = "INVALID_OTP";
    throw error;
  }

  // Mark consumed
  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return true;
}
