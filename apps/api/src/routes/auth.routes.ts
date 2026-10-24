import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import {
  sendOtpSchema,
  verifyOtpSchema,
  updateProfileSchema,
  sellerApplicationSchema,
} from "@dakshin/shared";
import { prisma } from "../lib/prisma.js";
import { sendOtp, verifyOtp } from "../services/otp.js";
import {
  generateAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../services/tokens.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();

// Rate limiting on OTP send (Max 10 requests per 15 minutes per IP)
const otpIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many OTP requests from this IP address. Please wait a few minutes.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/v1/auth/otp/send
 */
authRouter.post("/otp/send", otpIpLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = sendOtpSchema.parse(req.body);
    const result = await sendOtp(phone);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/otp/verify
 */
authRouter.post("/otp/verify", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = verifyOtpSchema.parse(req.body);
    await verifyOtp(input.phone, input.otp);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone: input.phone },
      include: { sellerProfile: true },
    });

    const isNewUser = !user;

    if (!user) {
      const initialRoles = input.role === "SELLER" ? "BUYER,SELLER" : "BUYER";

      user = await prisma.user.create({
        data: {
          phone: input.phone,
          name: input.name || "Farmer",
          roles: initialRoles,
          state: input.state || "TN",
          district: input.district || "Erode",
          language: input.language || "ta",
        },
        include: { sellerProfile: true },
      });

      if (input.role === "SELLER") {
        await prisma.sellerProfile.create({
          data: {
            userId: user.id,
            displayName: user.name,
            village: user.district,
            district: user.district,
            stateId: user.state,
            status: "PENDING",
          },
        });
      }
    }

    if (user.isBanned) {
      return res.status(403).json({
        error: {
          code: "ACCOUNT_BANNED",
          message: "This account has been suspended.",
        },
      });
    }

    const roles = user.roles.split(",").map((r) => r.trim());
    const accessToken = generateAccessToken({
      userId: user.id,
      phone: user.phone,
      roles,
    });

    const refreshToken = await createRefreshToken(
      user.id,
      req.headers["user-agent"],
      req.ip
    );

    setRefreshTokenCookie(res, refreshToken);

    const refreshedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { sellerProfile: true },
    });

    return res.json({
      success: true,
      isNewUser,
      accessToken,
      user: {
        id: refreshedUser!.id,
        phone: refreshedUser!.phone,
        name: refreshedUser!.name,
        roles: refreshedUser!.roles.split(",").map((r) => r.trim()),
        state: refreshedUser!.state,
        district: refreshedUser!.district,
        language: refreshedUser!.language,
        sellerProfile: refreshedUser!.sellerProfile,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/refresh
 */
authRouter.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      return res.status(401).json({
        error: {
          code: "REFRESH_TOKEN_REQUIRED",
          message: "No refresh token provided.",
        },
      });
    }

    const result = await rotateRefreshToken(
      rawToken,
      req.headers["user-agent"],
      req.ip
    );

    setRefreshTokenCookie(res, result.newRefreshToken);

    return res.json({
      accessToken: result.accessToken,
      user: {
        id: result.user.id,
        phone: result.user.phone,
        name: result.user.name,
        roles: result.user.roles.split(",").map((r: string) => r.trim()),
        state: result.user.state,
        district: result.user.district,
        language: result.user.language,
        sellerProfile: result.user.sellerProfile,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/logout
 */
authRouter.post("/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (rawToken) {
      await revokeRefreshToken(rawToken);
    }
    clearRefreshTokenCookie(res);
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/logout-all
 */
authRouter.post("/logout-all", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await revokeAllUserRefreshTokens(req.user!.id);
    clearRefreshTokenCookie(res);
    return res.json({ success: true, message: "Logged out from all devices" });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me
 */
authRouter.get("/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        sellerProfile: true,
        _count: {
          select: {
            listings: true,
            buyerOrders: true,
            sellerOrders: true,
            favorites: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    }

    return res.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        roles: user.roles.split(",").map((r) => r.trim()),
        state: user.state,
        district: user.district,
        language: user.language,
        sellerProfile: user.sellerProfile,
        stats: user._count,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/auth/me
 */
authRouter.patch("/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateProfileSchema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: input,
      include: { sellerProfile: true },
    });

    return res.json({
      success: true,
      user: {
        id: updated.id,
        phone: updated.phone,
        name: updated.name,
        roles: updated.roles.split(",").map((r) => r.trim()),
        state: updated.state,
        district: updated.district,
        language: updated.language,
        sellerProfile: updated.sellerProfile,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/me/roles/seller
 * Upgrade/Activate Seller Role
 */
authRouter.post("/me/roles/seller", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = sellerApplicationSchema.parse(req.body);

    // Update user roles if not already SELLER
    const currentRoles = req.user!.roles;
    if (!currentRoles.includes("SELLER")) {
      currentRoles.push("SELLER");
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { roles: currentRoles.join(",") },
      });
    }

    // Upsert seller profile
    const profile = await prisma.sellerProfile.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        displayName: input.displayName,
        village: input.village,
        district: input.district,
        stateId: input.stateId,
        idProofUrl: input.idProofUrl,
        status: "PENDING",
      },
      update: {
        displayName: input.displayName,
        village: input.village,
        district: input.district,
        stateId: input.stateId,
        idProofUrl: input.idProofUrl,
        status: "PENDING",
      },
    });

    return res.json({
      success: true,
      message: "Seller application submitted. Your profile is PENDING verification.",
      sellerProfile: profile,
    });
  } catch (err) {
    next(err);
  }
});
