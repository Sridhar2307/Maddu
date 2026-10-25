import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const schemesRouter = Router();

/**
 * GET /api/v1/schemes
 * Lists active Central & State government schemes, subsidies, and credit-linked incentives
 */
schemesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stateId } = req.query;

    const where: any = { active: true };
    if (stateId && stateId !== "ALL") {
      where.OR = [
        { stateId: String(stateId) },
        { stateId: null }, // Central schemes apply to all states
      ];
    }

    const schemes = await prisma.scheme.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      count: schemes.length,
      schemes,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/schemes/:id
 * Detailed scheme breakdown
 */
schemesRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scheme = await prisma.scheme.findUnique({
      where: { id: req.params.id },
    });

    if (!scheme) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Scheme not found" },
      });
    }

    return res.json({ scheme });
  } catch (err) {
    next(err);
  }
});

const applySchemeSchema = z.object({
  notes: z.string().optional(),
});

/**
 * POST /api/v1/schemes/:id/apply
 * Farmer files an interest/subsidy application through DakshinAgriHub facilitation desk
 */
schemesRouter.post("/:id/apply", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = applySchemeSchema.parse(req.body);

    const scheme = await prisma.scheme.findUnique({
      where: { id: req.params.id },
    });

    if (!scheme) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Government scheme not found" },
      });
    }

    // Check if existing open application exists
    const existing = await prisma.schemeApplication.findFirst({
      where: {
        userId: req.user!.id,
        schemeId: scheme.id,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: {
          code: "APPLICATION_EXISTS",
          message: "You have already submitted an active application for this scheme.",
          applicationRef: `DAH-SCH-${new Date(existing.createdAt).getFullYear()}-${existing.id.slice(0, 6).toUpperCase()}`,
        },
      });
    }

    const application = await prisma.schemeApplication.create({
      data: {
        userId: req.user!.id,
        schemeId: scheme.id,
        notes: input.notes,
        status: "SUBMITTED",
      },
      include: {
        scheme: true,
      },
    });

    const applicationRef = `DAH-SCH-${new Date().getFullYear()}-${application.id.slice(0, 6).toUpperCase()}`;

    return res.status(201).json({
      message: "Scheme application successfully registered with Agri Facilitation Desk",
      applicationRef,
      application: {
        id: application.id,
        schemeName: application.scheme.name,
        authority: application.scheme.authority,
        status: application.status,
        createdAt: application.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/schemes/user/my-applications
 * Retrieves user's submitted subsidy applications
 */
schemesRouter.get("/user/my-applications", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applications = await prisma.schemeApplication.findMany({
      where: { userId: req.user!.id },
      include: {
        scheme: {
          select: {
            id: true,
            name: true,
            authority: true,
            benefit: true,
            stateId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      count: applications.length,
      applications: applications.map((a: any) => ({
        id: a.id,
        applicationRef: `DAH-SCH-${new Date(a.createdAt).getFullYear()}-${a.id.slice(0, 6).toUpperCase()}`,
        scheme: a.scheme,
        status: a.status,
        notes: a.notes,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});
