import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

export const martRouter = Router();

// ============================================================================
// FODDER ENDPOINTS
// ============================================================================
martRouter.get("/fodder", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stateId } = req.query;
    const where: any = { status: "ACTIVE" };
    if (stateId && stateId !== "ALL") where.stateId = stateId as string;

    const items = await prisma.fodderListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        seller: { select: { name: true, district: true, state: true } },
      },
    });

    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

martRouter.post("/fodder/:id/order", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fodder = await prisma.fodderListing.findUnique({
      where: { id: req.params.id },
      include: { seller: true },
    });

    if (!fodder) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Fodder listing not found" } });
    }

    return res.json({
      success: true,
      message: `Fodder order request for "${fodder.title}" submitted. Seller ${fodder.seller.name} will contact you for delivery coordination.`,
      contactPhone: fodder.seller.phone,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// EQUIPMENT / MACHINERY HIRE ENDPOINTS
// ============================================================================
martRouter.get("/equipment", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stateId } = req.query;
    const where: any = { status: "ACTIVE" };
    if (stateId && stateId !== "ALL") where.stateId = stateId as string;

    const items = await prisma.equipmentListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        seller: { select: { name: true, district: true, state: true } },
      },
    });

    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

martRouter.post("/equipment/:id/book", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const equip = await prisma.equipmentListing.findUnique({
      where: { id: req.params.id },
      include: { seller: true },
    });

    if (!equip) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Equipment listing not found" } });
    }

    return res.json({
      success: true,
      message: `Machinery hire request for "${equip.title}" submitted. Operator will coordinate delivery to your field.`,
      ownerPhone: equip.seller.phone,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// FAVORITES & ENQUIRIES
// ============================================================================
martRouter.post("/favorites/:listingId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fav = await prisma.favorite.upsert({
      where: {
        userId_listingId: {
          userId: req.user!.id,
          listingId: req.params.listingId,
        },
      },
      create: {
        userId: req.user!.id,
        listingId: req.params.listingId,
      },
      update: {},
    });

    return res.json({ success: true, favorite: fav });
  } catch (err) {
    next(err);
  }
});

martRouter.delete("/favorites/:listingId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.favorite.deleteMany({
      where: {
        userId: req.user!.id,
        listingId: req.params.listingId,
      },
    });
    return res.json({ success: true, message: "Removed from favorites" });
  } catch (err) {
    next(err);
  }
});

martRouter.get("/me/favorites", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: {
        listing: {
          include: {
            images: true,
            seller: { select: { name: true, district: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ favorites });
  } catch (err) {
    next(err);
  }
});

martRouter.post("/listings/:id/enquiries", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return res.status(400).json({
        error: { code: "INVALID_MESSAGE", message: "Please enter a valid enquiry message." },
      });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
    });

    if (!listing || listing.deletedAt) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Listing not found" } });
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        listingId: listing.id,
        buyerId: req.user!.id,
        message: message.trim(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Enquiry sent to the seller.",
      enquiry,
    });
  } catch (err) {
    next(err);
  }
});

martRouter.get("/me/enquiries", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enquiries = await prisma.enquiry.findMany({
      where: {
        OR: [
          { buyerId: req.user!.id },
          { listing: { sellerId: req.user!.id } },
        ],
      },
      include: {
        listing: { select: { id: true, title: true, price: true } },
        buyer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ enquiries });
  } catch (err) {
    next(err);
  }
});
