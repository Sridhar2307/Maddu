import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { generateAccessToken } from "../src/services/tokens.js";

describe("Phase 3: Orders, Escrow (Razorpay Test Mode), Webhooks & Concurrency Guard", () => {
  let buyer1Token: string;
  let buyer2Token: string;
  let seller1Token: string;
  let testListingId: string;
  let orderId: string;
  let razorpayOrderId: string;

  beforeAll(async () => {
    const buyer1 = await prisma.user.findUnique({ where: { phone: "+919000000004" } });
    const buyer2 = await prisma.user.findUnique({ where: { phone: "+919000000005" } });
    const seller1 = await prisma.user.findUnique({ where: { phone: "+919000000002" } });

    buyer1Token = generateAccessToken({
      userId: buyer1!.id,
      phone: buyer1!.phone,
      roles: ["BUYER"],
    });

    buyer2Token = generateAccessToken({
      userId: buyer2!.id,
      phone: buyer2!.phone,
      roles: ["BUYER"],
    });

    seller1Token = generateAccessToken({
      userId: seller1!.id,
      phone: seller1!.phone,
      roles: ["BUYER", "SELLER"],
    });

    // Find an active listing by seller 1
    const listing = await prisma.listing.findFirst({
      where: { sellerId: seller1!.id, status: "ACTIVE" },
    });
    testListingId = listing!.id;
  });

  it("1. Buyer 1 creates an escrow order for livestock listing", async () => {
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${buyer1Token}`)
      .send({
        listingId: testListingId,
        legalComplianceConfirmed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order.status).toBe("CREATED");
    orderId = res.body.order.id;
  });

  it("2. Double-selling Concurrency Guard: Buyer 2 attempting to buy the same animal gets 409 Conflict", async () => {
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${buyer2Token}`)
      .send({
        listingId: testListingId,
        legalComplianceConfirmed: true,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ANIMAL_ALREADY_RESERVED");
  });

  it("3. POST /api/v1/orders/:id/pay creates Razorpay test order", async () => {
    const res = await request(app)
      .post(`/api/v1/orders/${orderId}/pay`)
      .set("Authorization", `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.razorpayOrderId).toBeDefined();
    razorpayOrderId = res.body.razorpayOrderId;
  });

  it("4. Webhook updates order to PAID_ESCROW and pauses listing", async () => {
    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .send({
        order_id: razorpayOrderId,
        payment_id: "pay_test_escrow_12345",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PROCESSED");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe("PAID_ESCROW");

    const listing = await prisma.listing.findUnique({ where: { id: testListingId } });
    expect(listing!.status).toBe("PAUSED");
  });

  it("5. Webhook Idempotency: Replaying the same webhook does not re-process or crash", async () => {
    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .send({
        order_id: razorpayOrderId,
        payment_id: "pay_test_escrow_12345",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("IGNORED_DUPLICATE");
  });

  it("6. Seller marks animal DISPATCHED in ventilated vehicle", async () => {
    const res = await request(app)
      .post(`/api/v1/orders/${orderId}/dispatch`)
      .set("Authorization", `Bearer ${seller1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("7. Buyer confirms animal DELIVERED after ear-tag verification", async () => {
    const res = await request(app)
      .post(`/api/v1/orders/${orderId}/confirm-delivery`)
      .set("Authorization", `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("8. Buyer releases escrow funds to seller -> status RELEASED and listing status SOLD", async () => {
    const res = await request(app)
      .post(`/api/v1/orders/${orderId}/release`)
      .set("Authorization", `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe("RELEASED");

    const listing = await prisma.listing.findUnique({ where: { id: testListingId } });
    expect(listing!.status).toBe("SOLD");
  });

  it("9. Server calculates freight quote accurately", async () => {
    const res = await request(app)
      .post("/api/v1/freight/quote")
      .send({
        fromDistrict: "Erode",
        toDistrict: "Palakkad",
        km: 140,
        vehicleType: "BOLERO",
      });

    expect(res.status).toBe(200);
    expect(res.body.ratePerKm).toBe(28);
    expect(res.body.checkpostPermitFee).toBe(350);
    expect(res.body.totalCost).toBe(140 * 28 + 350); // 4270
  });
});
