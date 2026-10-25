import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { JwtUserPayload } from "../services/tokens.js";

// Augment Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        roles: string[];
        isBanned: boolean;
        sellerProfile?: any;
      };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required. Please log in.",
      },
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUserPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { sellerProfile: true },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User account no longer exists.",
        },
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        error: {
          code: "ACCOUNT_BANNED",
          message: "This account has been banned due to policy violation.",
        },
      });
    }

    req.user = {
      id: user.id,
      phone: user.phone,
      roles: user.roles.split(",").map((r: any) => r.trim()),
      isBanned: user.isBanned,
      sellerProfile: user.sellerProfile,
    };

    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: {
          code: "TOKEN_EXPIRED",
          message: "Access token has expired. Please refresh your session.",
        },
      });
    }

    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid authentication token.",
      },
    });
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUserPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { sellerProfile: true },
    });

    if (user && !user.isBanned) {
      req.user = {
        id: user.id,
        phone: user.phone,
        roles: user.roles.split(",").map((r: any) => r.trim()),
        isBanned: user.isBanned,
        sellerProfile: user.sellerProfile,
      };
    }
  } catch {
    // Ignore invalid token on optional auth
  }

  next();
}
