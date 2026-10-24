import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import {
  createListingSchema,
  updateListingSchema,
  listingQuerySchema,
} from "@dakshin/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { uploadImages } from "../services/storage.js";
import { generatePassportPdf } from "../services/passport.js";

export const listingsRouter = Router();

// Rate limit for revealing seller contact numbers (20 per day per user IP)
const contactRevealLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  message: {
    error: {
      code: "CONTACT_RATE_LIMIT",
      message: "Daily limit reached for viewing seller phone numbers (20/day) to prevent spam.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /api/v1/listings
 * Public browse with filtering, search, and pagination.
 * Seller phone numbers are ALWAYS hidden in this response.
 */
listingsRouter.get("/", optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listingQuerySchema.parse(req.query);
    const { stateId, breed, category, minPrice, maxPrice, q, page, limit, sort } = query;

    const where: any = {
      deletedAt: null,
      status: "ACTIVE",
    };

    if (stateId && stateId !== "ALL") {
      where.stateId = stateId;
    }
    if (breed && breed !== "ALL") {
      where.breed = breed;
    }
    if (category) {
      where.category = category;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    if (q && q.trim()) {
      where.OR = [
        { title: { contains: q } },
        { breed: { contains: q } },
        { district: { contains: q } },
        { earTagId: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const orderBy: any = {};
    if (sort === "price_asc") orderBy.price = "asc";
    else if (sort === "price_desc") orderBy.price = "desc";
    else orderBy.createdAt = "desc";

    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { orderBy: { order: "asc" } },
          vaccinations: true,
          seller: {
            select: {
              id: true,
              name: true,
              district: true,
              state: true,
              sellerProfile: {
                select: {
                  displayName: true,
                  status: true,
                  verifiedAt: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Format safe response with phone numbers MASKED
    const safeListings = items.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      breed: item.breed,
      stateId: item.stateId,
      district: item.district,
      price: item.price,
      ageMonths: item.ageMonths,
      dailyYield: item.dailyYield,
      lactation: item.lactation,
      pregnancyStatus: item.pregnancyStatus,
      estimatedWeight: item.estimatedWeight,
      heartGirthCm: item.heartGirthCm,
      bodyLengthCm: item.bodyLengthCm,
      earTagId: item.earTagId,
      earTagVerified: item.earTagVerified,
      diet: item.diet,
      description: item.description,
      status: item.status,
      viewCount: item.viewCount,
      createdAt: item.createdAt,
      images: item.images.map((img) => img.url),
      imageUrl: item.images[0]?.url || "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80",
      vaccinations: item.vaccinations,
      seller: {
        id: item.seller.id,
        displayName: item.seller.sellerProfile?.displayName || item.seller.name,
        district: item.seller.district,
        state: item.seller.state,
        verificationStatus: item.seller.sellerProfile?.status || "NOT_VERIFIED",
        isVerified: item.seller.sellerProfile?.status === "APPROVED",
        // Phone number is deliberately omitted for public browsing
      },
    }));

    return res.json({
      items: safeListings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/listings/:id
 * Detailed listing information. Phone number is hidden unless viewer is the owner.
 */
listingsRouter.get("/:id", optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        images: { orderBy: { order: "asc" } },
        vaccinations: true,
        seller: {
          select: {
            id: true,
            name: true,
            phone: true,
            district: true,
            state: true,
            sellerProfile: true,
          },
        },
      },
    });

    if (!listing || listing.deletedAt) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Livestock listing not found or has been removed." },
      });
    }

    // Atomically increment viewCount
    await prisma.listing.update({
      where: { id: listing.id },
      data: { viewCount: { increment: 1 } },
    });

    const isOwner = req.user?.id === listing.sellerId;

    return res.json({
      listing: {
        id: listing.id,
        title: listing.title,
        category: listing.category,
        breed: listing.breed,
        stateId: listing.stateId,
        district: listing.district,
        price: listing.price,
        ageMonths: listing.ageMonths,
        dailyYield: listing.dailyYield,
        lactation: listing.lactation,
        pregnancyStatus: listing.pregnancyStatus,
        estimatedWeight: listing.estimatedWeight,
        heartGirthCm: listing.heartGirthCm,
        bodyLengthCm: listing.bodyLengthCm,
        earTagId: listing.earTagId,
        earTagVerified: listing.earTagVerified,
        diet: listing.diet,
        description: listing.description,
        status: listing.status,
        viewCount: listing.viewCount + 1,
        createdAt: listing.createdAt,
        images: listing.images.map((img) => img.url),
        imageUrl: listing.images[0]?.url || "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80",
        vaccinations: listing.vaccinations,
        seller: {
          id: listing.seller.id,
          displayName: listing.seller.sellerProfile?.displayName || listing.seller.name,
          district: listing.seller.district,
          state: listing.seller.state,
          verificationStatus: listing.seller.sellerProfile?.status || "NOT_VERIFIED",
          isVerified: listing.seller.sellerProfile?.status === "APPROVED",
          phone: isOwner ? listing.seller.phone : `${listing.seller.phone.slice(0, 6)}XXXXX`,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/listings/:id/passport.pdf
 * Generates an official, tamper-evident digital livestock passport PDF
 */
listingsRouter.get("/:id/passport.pdf", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        images: true,
        vaccinations: true,
        seller: {
          include: { sellerProfile: true },
        },
      },
    });

    if (!listing || listing.deletedAt) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Livestock listing not found or has been removed." },
      });
    }

    await generatePassportPdf(listing, res);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/listings
 * Requires SELLER role. A BUYER will receive 403 Forbidden.
 */
listingsRouter.post(
  "/",
  authenticate,
  requireRole("SELLER", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createListingSchema.parse(req.body);
      const isApprovedSeller = req.user!.sellerProfile?.status === "APPROVED";

      const listing = await prisma.listing.create({
        data: {
          sellerId: req.user!.id,
          title: input.title,
          category: input.category,
          breed: input.breed,
          stateId: input.stateId,
          district: input.district,
          price: input.price,
          ageMonths: input.ageMonths,
          dailyYield: input.dailyYield,
          lactation: input.lactation,
          pregnancyStatus: input.pregnancyStatus,
          estimatedWeight: input.estimatedWeight,
          heartGirthCm: input.heartGirthCm,
          bodyLengthCm: input.bodyLengthCm,
          earTagId: input.earTagId,
          earTagVerified: isApprovedSeller && !!input.earTagId,
          diet: input.diet,
          description: input.description,
          status: "ACTIVE",
          images: {
            create: input.imageUrls.map((url, index) => ({
              url,
              order: index,
            })),
          },
        },
        include: {
          images: true,
          seller: { select: { name: true, phone: true } },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Livestock listing published successfully.",
        listing,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/listings/:id
 * Owner or Admin only (IDOR Protection)
 */
listingsRouter.patch(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.listing.findUnique({
        where: { id: req.params.id },
      });

      if (!existing || existing.deletedAt) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Listing not found" } });
      }

      // IDOR check: only the seller who created this listing or an ADMIN can update it
      const isOwner = existing.sellerId === req.user!.id;
      const isAdmin = req.user!.roles.includes("ADMIN");

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to modify another seller's listing.",
          },
        });
      }

      const input = updateListingSchema.parse(req.body);
      const { imageUrls, ...dataToUpdate } = input;

      const updated = await prisma.listing.update({
        where: { id: req.params.id },
        data: dataToUpdate,
        include: { images: true },
      });

      return res.json({
        success: true,
        listing: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/listings/:id
 * Owner or Admin only (Soft Delete)
 */
listingsRouter.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.listing.findUnique({
        where: { id: req.params.id },
      });

      if (!existing || existing.deletedAt) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Listing not found" } });
      }

      const isOwner = existing.sellerId === req.user!.id;
      const isAdmin = req.user!.roles.includes("ADMIN");

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "You cannot delete another seller's listing.",
          },
        });
      }

      await prisma.listing.update({
        where: { id: req.params.id },
        data: {
          deletedAt: new Date(),
          status: "REMOVED",
        },
      });

      return res.json({ success: true, message: "Listing removed successfully" });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/listings/:id/contact
 * Reveal seller phone number for authenticated users only, rate-limited and audit logged.
 */
listingsRouter.post(
  "/:id/contact",
  authenticate,
  contactRevealLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: req.params.id },
        include: { seller: true },
      });

      if (!listing || listing.deletedAt) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Listing not found" } });
      }

      // Log access in audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: "VIEW_SELLER_PHONE",
          entity: "Listing",
          entityId: listing.id,
          ip: req.ip,
          meta: JSON.stringify({ sellerId: listing.sellerId }),
        },
      });

      return res.json({
        success: true,
        sellerPhone: listing.seller.phone,
        sellerName: listing.seller.name,
        whatsappLink: `https://wa.me/${listing.seller.phone.replace(/[^0-9]/g, "")}?text=Hello%20${encodeURIComponent(listing.seller.name)},%20I%20am%20interested%20in%20your%20listing:%20${encodeURIComponent(listing.title)}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/listings/:id/images
 * Upload up to 5 images with MIME verification
 */
listingsRouter.post(
  "/:id/images",
  authenticate,
  uploadImages.array("images", 5),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: req.params.id },
      });

      if (!listing || listing.deletedAt) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Listing not found" } });
      }

      if (listing.sellerId !== req.user!.id && !req.user!.roles.includes("ADMIN")) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not your listing" } });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: { code: "NO_FILES", message: "Please select image files to upload." } });
      }

      const createdImages = await Promise.all(
        files.map((file, idx) =>
          prisma.listingImage.create({
            data: {
              listingId: listing.id,
              url: `/uploads/${file.filename}`,
              order: idx,
            },
          })
        )
      );

      return res.json({
        success: true,
        images: createdImages.map((img) => img.url),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/listings/:id/report
 * Flag fake or abusive listing
 */
listingsRouter.post(
  "/:id/report",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body;
      if (!reason || typeof reason !== "string" || reason.length < 5) {
        return res.status(400).json({
          error: { code: "INVALID_REASON", message: "Please provide a valid report reason (at least 5 characters)." },
        });
      }

      await prisma.report.create({
        data: {
          reporterId: req.user!.id,
          listingId: req.params.id,
          reason,
        },
      });

      return res.json({
        success: true,
        message: "Thank you. Our moderation team has received your report.",
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/listings/me/my-listings
 * Seller's own listings dashboard
 */
listingsRouter.get(
  "/me/my-listings",
  authenticate,
  requireRole("SELLER", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listings = await prisma.listing.findMany({
        where: {
          sellerId: req.user!.id,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        include: {
          images: true,
          _count: { select: { orders: true, enquiries: true, favorites: true } },
        },
      });

      return res.json({
        success: true,
        listings,
      });
    } catch (err) {
      next(err);
    }
  }
);
