import { Router, Request, Response, NextFunction } from "express";
import {
  createOrderSchema,
  disputeOrderSchema,
  freightQuoteSchema,
  createTruckBookingSchema,
} from "@dakshin/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import {
  createRazorpayOrder,
  verifyWebhookSignature,
  calculateServerFreight,
} from "../services/escrow.js";

export const ordersRouter = Router();

/**
 * POST /api/v1/orders
 * Place an order with concurrency / double-selling protection
 */
ordersRouter.post("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createOrderSchema.parse(req.body);

    const listing = await prisma.listing.findUnique({
      where: { id: input.listingId },
      include: { seller: true },
    });

    if (!listing || listing.deletedAt) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Listing not found" } });
    }

    if (listing.sellerId === req.user!.id) {
      return res.status(400).json({
        error: { code: "CANNOT_BUY_OWN_LISTING", message: "You cannot purchase your own listing." },
      });
    }

    if (listing.status !== "ACTIVE") {
      return res.status(400).json({
        error: { code: "LISTING_NOT_AVAILABLE", message: `This listing is currently ${listing.status}.` },
      });
    }

    // Double-selling concurrency protection
    // Check if another active order is already in progress for this animal
    const activeOrder = await prisma.order.findFirst({
      where: {
        listingId: listing.id,
        status: { in: ["CREATED", "PAID_ESCROW", "DISPATCHED", "DELIVERED"] },
      },
    });

    if (activeOrder) {
      return res.status(409).json({
        error: {
          code: "ANIMAL_ALREADY_RESERVED",
          message: "Another buyer is currently processing an escrow order for this animal.",
        },
      });
    }

    // Atomic transaction to create order and initial timeline event
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          listingId: listing.id,
          buyerId: req.user!.id,
          sellerId: listing.sellerId,
          amount: listing.price,
          status: "CREATED",
        },
        include: {
          listing: { select: { title: true, breed: true, price: true } },
          seller: { select: { name: true, phone: true } },
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: "CREATED",
          note: "Order created by buyer. Awaiting escrow payment.",
        },
      });

      return order;
    });

    return res.status(201).json({
      success: true,
      order: newOrder,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/orders/:id/pay
 * Generates Razorpay checkout order
 */
ordersRouter.post("/:id/pay", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { listing: true },
    });

    if (!order) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Order not found" } });
    }

    if (order.buyerId !== req.user!.id) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only buyer can pay for this order" } });
    }

    if (order.status !== "CREATED") {
      return res.status(400).json({
        error: { code: "INVALID_ORDER_STATUS", message: `Order cannot be paid in ${order.status} status.` },
      });
    }

    const rzpOrder = await createRazorpayOrder(order.id, order.amount);

    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrder.id },
    });

    return res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_mock_dakshin_key",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/payments/webhook
 * Idempotent payment webhook
 */
ordersRouter.post("/payments/webhook", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = (req.headers["x-razorpay-signature"] as string) || "";
    const isValid = verifyWebhookSignature(JSON.stringify(req.body), signature);

    if (!isValid) {
      return res.status(400).json({ error: { code: "INVALID_SIGNATURE", message: "Webhook signature mismatch" } });
    }

    const event = req.body;
    const payment = event.payload?.payment?.entity;
    const rzpOrderId = payment?.order_id || req.body.order_id;
    const paymentId = payment?.id || req.body.payment_id || `pay_mock_${Date.now()}`;

    if (!rzpOrderId) {
      return res.status(400).json({ error: { code: "NO_ORDER_ID", message: "Missing order reference in webhook" } });
    }

    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: rzpOrderId },
    });

    if (!order) {
      return res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "Order not found for razorpay order ID" } });
    }

    // IDEMPOTENCY GUARD: If already marked PAID_ESCROW or later, ignore replay
    if (order.status !== "CREATED") {
      return res.json({ status: "IGNORED_DUPLICATE", orderId: order.id, currentStatus: order.status });
    }

    // Process payment atomically
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID_ESCROW",
          razorpayPaymentId: paymentId,
        },
      });

      // Pause listing so others cannot buy it
      await tx.listing.update({
        where: { id: order.listingId },
        data: { status: "PAUSED" },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: "PAID_ESCROW",
          note: `Payment of ₹${order.amount.toLocaleString("en-IN")} held in PashuSafe escrow partner account (Payment ID: ${paymentId})`,
        },
      });
    });

    return res.json({ status: "PROCESSED", orderId: order.id });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/orders/:id/dispatch
 * Seller marks animal dispatched in ventilated truck
 */
ordersRouter.post("/:id/dispatch", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });

    if (!order) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Order not found" } });
    if (order.sellerId !== req.user!.id && !req.user!.roles.includes("ADMIN")) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only seller can mark dispatched" } });
    }
    if (order.status !== "PAID_ESCROW") {
      return res.status(400).json({ error: { code: "INVALID_STATUS", message: "Order must be in PAID_ESCROW status" } });
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: "DISPATCHED" },
      }),
      prisma.orderEvent.create({
        data: {
          orderId: order.id,
          status: "DISPATCHED",
          note: "Livestock dispatched in ventilated transit vehicle with transit health permit.",
        },
      }),
    ]);

    return res.json({ success: true, message: "Order marked DISPATCHED" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/orders/:id/confirm-delivery
 * Buyer confirms healthy arrival
 */
ordersRouter.post("/:id/confirm-delivery", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });

    if (!order) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Order not found" } });
    if (order.buyerId !== req.user!.id && !req.user!.roles.includes("ADMIN")) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only buyer can confirm delivery" } });
    }
    if (order.status !== "DISPATCHED") {
      return res.status(400).json({ error: { code: "INVALID_STATUS", message: "Order is not in DISPATCHED status" } });
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: "DELIVERED" },
      }),
      prisma.orderEvent.create({
        data: {
          orderId: order.id,
          status: "DELIVERED",
          note: "Buyer inspected animal, verified ear-tag and confirmed arrival.",
        },
      }),
    ]);

    return res.json({ success: true, message: "Delivery confirmed" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/orders/:id/release
 * Buyer or Admin releases escrow payout to seller
 */
ordersRouter.post("/:id/release", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });

    if (!order) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Order not found" } });
    if (order.buyerId !== req.user!.id && !req.user!.roles.includes("ADMIN")) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only buyer or admin can release escrow" } });
    }
    if (order.status !== "DELIVERED") {
      return res.status(400).json({ error: { code: "INVALID_STATUS", message: "Order must be DELIVERED before escrow release" } });
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: "RELEASED" },
      }),
      prisma.listing.update({
        where: { id: order.listingId },
        data: { status: "SOLD" },
      }),
      prisma.orderEvent.create({
        data: {
          orderId: order.id,
          status: "RELEASED",
          note: `Escrow funds of ₹${order.amount.toLocaleString("en-IN")} released to seller. Transaction completed.`,
        },
      }),
    ]);

    return res.json({ success: true, message: "Escrow funds released to seller" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/orders/:id/dispute
 */
ordersRouter.post("/:id/dispute", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = disputeOrderSchema.parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });

    if (!order) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Order not found" } });
    if (order.buyerId !== req.user!.id && order.sellerId !== req.user!.id && !req.user!.roles.includes("ADMIN")) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: "DISPUTED", disputeReason: reason },
      }),
      prisma.orderEvent.create({
        data: {
          orderId: order.id,
          status: "DISPUTED",
          note: `Dispute filed by ${req.user!.roles.join("/")}: ${reason}`,
        },
      }),
    ]);

    return res.json({ success: true, message: "Dispute recorded. Our support mediator will intervene within 24 hours." });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/orders/me/all
 * Current user's purchases and sales
 */
ordersRouter.get("/me/all", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [purchases, sales] = await Promise.all([
      prisma.order.findMany({
        where: { buyerId: req.user!.id },
        include: {
          listing: { select: { id: true, title: true, breed: true } },
          seller: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.findMany({
        where: { sellerId: req.user!.id },
        include: {
          listing: { select: { id: true, title: true, breed: true } },
          buyer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.json({ purchases, sales });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/orders/:id/timeline
 */
ordersRouter.get("/:id/timeline", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        timeline: { orderBy: { createdAt: "asc" } },
        listing: { select: { title: true, price: true } },
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
      },
    });

    if (!order) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Order not found" } });
    if (order.buyerId !== req.user!.id && order.sellerId !== req.user!.id && !req.user!.roles.includes("ADMIN")) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
    }

    return res.json({ order });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// LOGISTICS & FREIGHT ENDPOINTS
// ============================================================================
ordersRouter.post("/freight/quote", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { km, vehicleType } = freightQuoteSchema.parse(req.body);
    const quote = calculateServerFreight(km, vehicleType);
    return res.json(quote);
  } catch (err) {
    next(err);
  }
});

ordersRouter.post("/truck-bookings", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createTruckBookingSchema.parse(req.body);
    const quote = calculateServerFreight(input.km, input.vehicleType);

    const booking = await prisma.truckBooking.create({
      data: {
        userId: req.user!.id,
        orderId: input.orderId,
        fromDistrict: input.fromDistrict,
        toDistrict: input.toDistrict,
        km: input.km,
        vehicleType: input.vehicleType,
        price: quote.totalCost,
        status: "BOOKED",
        pickupDate: input.pickupDate,
        contactPhone: input.contactPhone,
      },
    });

    return res.status(201).json({
      success: true,
      booking,
      quote,
      message: `Ventilated livestock truck booked. Driver details sent to ${input.contactPhone}.`,
    });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get("/me/truck-bookings", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await prisma.truckBooking.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ bookings });
  } catch (err) {
    next(err);
  }
});
