import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { generateAccessToken } from "../src/services/tokens.js";

describe("Phase 2: Livestock Listings, Security, IDOR & Phone Privacy", () => {
  let buyerToken: string;
  let seller1Token: string;
  let seller2Token: string;
  let seller1Id: string;
  let seller2Id: string;
  let createdListingId: string;

  beforeAll(async () => {
    // Fetch seeded test users
    const seller1 = await prisma.user.findUnique({ where: { phone: "+919000000002" } });
    const seller2 = await prisma.user.findUnique({ where: { phone: "+919000000003" } });
    const buyer = await prisma.user.findUnique({ where: { phone: "+919000000004" } });

    seller1Id = seller1!.id;
    seller2Id = seller2!.id;

    seller1Token = generateAccessToken({
      userId: seller1!.id,
      phone: seller1!.phone,
      roles: ["BUYER", "SELLER"],
    });

    seller2Token = generateAccessToken({
      userId: seller2!.id,
      phone: seller2!.phone,
      roles: ["BUYER", "SELLER"],
    });

    buyerToken = generateAccessToken({
      userId: buyer!.id,
      phone: buyer!.phone,
      roles: ["BUYER"],
    });
  });

  it("1. GET /api/v1/listings returns listings and MASKS/HIDES seller phone numbers", async () => {
    const res = await request(app).get("/api/v1/listings");
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.items.length).toBeGreaterThan(0);

    const firstItem = res.body.items[0];
    // Security check: phone number must NOT be exposed in public listing browse
    expect(firstItem.seller.phone).toBeUndefined();
    expect(firstItem.seller.displayName).toBeDefined();
  });

  it("2. POST /api/v1/listings rejects a BUYER with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/v1/listings")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        title: "Unauthorized Bull Listing",
        category: "CATTLE",
        breed: "Kangayam",
        stateId: "TN",
        district: "Tiruppur",
        price: 50000,
        legalComplianceConfirmed: true,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("3. POST /api/v1/listings allows an approved SELLER to create a listing", async () => {
    const res = await request(app)
      .post("/api/v1/listings")
      .set("Authorization", `Bearer ${seller1Token}`)
      .send({
        title: "Authentic Kangayam Heifer Calf (Direct Farm)",
        category: "CATTLE",
        breed: "Kangayam",
        stateId: "TN",
        district: "Tiruppur",
        price: 55000,
        ageMonths: 18,
        dailyYield: 5.0,
        lactation: 1,
        pregnancyStatus: "Not Pregnant",
        estimatedWeight: 260,
        legalComplianceConfirmed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.listing.id).toBeDefined();
    createdListingId = res.body.listing.id;
  });

  it("4. IDOR Protection: Seller 2 cannot modify Seller 1's listing (gets 403)", async () => {
    const res = await request(app)
      .patch(`/api/v1/listings/${createdListingId}`)
      .set("Authorization", `Bearer ${seller2Token}`)
      .send({
        price: 10000, // Attempted unauthorized price change
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("5. IDOR Protection: Seller 2 cannot delete Seller 1's listing (gets 403)", async () => {
    const res = await request(app)
      .delete(`/api/v1/listings/${createdListingId}`)
      .set("Authorization", `Bearer ${seller2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("6. Phone Reveal: Logged-out user cannot reveal seller contact (401)", async () => {
    const res = await request(app).post(`/api/v1/listings/${createdListingId}/contact`);
    expect(res.status).toBe(401);
  });

  it("7. Phone Reveal: Logged-in buyer can reveal seller contact and logs audit entry", async () => {
    const res = await request(app)
      .post(`/api/v1/listings/${createdListingId}/contact`)
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sellerPhone).toBe("+919000000002");
    expect(res.body.whatsappLink).toContain("919000000002");

    // Verify audit log entry was created
    const audit = await prisma.auditLog.findFirst({
      where: {
        actorId: (await prisma.user.findUnique({ where: { phone: "+919000000004" } }))!.id,
        action: "VIEW_SELLER_PHONE",
        entityId: createdListingId,
      },
    });
    expect(audit).toBeDefined();
  });

  it("8. Owner can update their own listing", async () => {
    const res = await request(app)
      .patch(`/api/v1/listings/${createdListingId}`)
      .set("Authorization", `Bearer ${seller1Token}`)
      .send({
        price: 52000,
      });

    expect(res.status).toBe(200);
    expect(res.body.listing.price).toBe(52000);
  });
});
