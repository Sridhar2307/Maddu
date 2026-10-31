import { Request, Response, NextFunction } from "express";

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      });
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. You are currently [${req.user.roles.join(", ")}].`,
        },
      });
    }

    next();
  };
}

export function requireApprovedSeller(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    });
  }

  if (!req.user.roles.includes("SELLER")) {
    return res.status(403).json({
      error: {
        code: "SELLER_ROLE_REQUIRED",
        message: "You must activate a SELLER profile before performing this action.",
      },
    });
  }

  if (req.user.sellerProfile?.status !== "APPROVED") {
    return res.status(403).json({
      error: {
        code: "SELLER_NOT_VERIFIED",
        message:
          req.user.sellerProfile?.status === "PENDING"
            ? "Your seller profile verification is currently PENDING admin approval."
            : "Your seller profile verification has not been approved.",
      },
    });
  }

  next();
}
