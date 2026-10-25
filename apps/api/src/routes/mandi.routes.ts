import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const mandiRouter = Router();

/**
 * GET /api/v1/mandi/rates
 * Returns live/cached APMC mandi rates with staleness indicator
 */
mandiRouter.get("/rates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { state, commodity, market } = req.query;

    const where: any = {};
    if (state && state !== "ALL") where.state = { contains: String(state) };
    if (commodity && commodity !== "ALL") where.commodity = { contains: String(commodity) };
    if (market) where.market = { contains: String(market) };

    const rates = await prisma.mandiRate.findMany({
      where,
      orderBy: { arrivalDate: "desc" },
      take: 100,
    });

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const formatted = rates.map((r: any) => {
      const isStale = now - new Date(r.fetchedAt).getTime() > ONE_DAY_MS;
      return {
        id: r.id,
        market: r.market,
        state: r.state,
        commodity: r.commodity,
        minPrice: r.minPrice,
        maxPrice: r.maxPrice,
        modalPrice: r.modalPrice,
        unit: r.unit,
        arrivalDate: r.arrivalDate,
        fetchedAt: r.fetchedAt,
        staleWarning: isStale,
      };
    });

    return res.json({
      count: formatted.length,
      source: "Agmarknet APMC Direct Feed & State Agricultural Marketing Boards",
      fetchedAt: new Date().toISOString(),
      rates: formatted,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/mandi/shandies
 * Returns weekly livestock shandies (cattle & goat markets) across South India
 */
mandiRouter.get("/shandies", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stateId, dayOfWeek } = req.query;

    const where: any = {};
    if (stateId && stateId !== "ALL") where.stateId = String(stateId);
    if (dayOfWeek && dayOfWeek !== "ALL") where.dayOfWeek = String(dayOfWeek);

    const shandies = await prisma.shandy.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return res.json({
      count: shandies.length,
      shandies,
    });
  } catch (err) {
    next(err);
  }
});

const alertSchema = z.object({
  commodity: z.string().min(2),
  market: z.string().optional(),
  thresholdPrice: z.number().positive().optional(),
  channel: z.enum(["SMS", "WHATSAPP"]).default("SMS"),
});

/**
 * POST /api/v1/mandi/alerts
 * Subscribes user to real price alerts
 */
mandiRouter.post("/alerts", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = alertSchema.parse(req.body);

    const alert = await prisma.mandiAlert.create({
      data: {
        userId: req.user!.id,
        commodity: input.commodity,
        market: input.market,
        thresholdPrice: input.thresholdPrice,
        channel: input.channel,
      },
    });

    return res.status(201).json({
      message: "Price alert subscribed successfully",
      alert,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/mandi/alerts
 * Lists active price alerts for the current user
 */
mandiRouter.get("/alerts", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await prisma.mandiAlert.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/mandi/alerts/:id
 * Removes a price alert
 */
mandiRouter.delete("/alerts/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await prisma.mandiAlert.findUnique({
      where: { id: req.params.id },
    });

    if (!alert || alert.userId !== req.user!.id) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Alert not found or unauthorized" },
      });
    }

    await prisma.mandiAlert.delete({
      where: { id: req.params.id },
    });

    return res.json({ message: "Price alert cancelled" });
  } catch (err) {
    next(err);
  }
});
