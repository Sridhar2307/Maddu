import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

describe("Mandi, PashuCare, Schemes & Digital Passport Endpoints", () => {
  let buyerToken: string;
  let sampleListingId: string;
  let sampleSchemeId: string;

  beforeAll(async () => {
    // Send OTP and verify as seeded Buyer 1
    const sendRes = await request(app)
      .post("/api/v1/auth/otp/send")
      .send({ phone: "+919000000004" });
    const otp = sendRes.body.debugOtp || "123456";

    const res = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ phone: "+919000000004", otp });
    buyerToken = res.body.accessToken;

    const listing = await prisma.listing.findFirst({
      where: { status: "ACTIVE" },
    });
    sampleListingId = listing!.id;

    const scheme = await prisma.scheme.findFirst();
    sampleSchemeId = scheme!.id;
  });

  describe("Mandi Rates & Shandies", () => {
    it("GET /api/v1/mandi/rates returns live rates with staleness check and source", async () => {
      const res = await request(app).get("/api/v1/mandi/rates");
      expect(res.status).toBe(200);
      expect(res.body.rates).toBeInstanceOf(Array);
      expect(res.body.source).toContain("Agmarknet");
      expect(res.body).toHaveProperty("fetchedAt");
      if (res.body.rates.length > 0) {
        expect(res.body.rates[0]).toHaveProperty("staleWarning");
        expect(res.body.rates[0]).toHaveProperty("modalPrice");
      }
    });

    it("GET /api/v1/mandi/shandies returns weekly livestock markets", async () => {
      const res = await request(app).get("/api/v1/mandi/shandies");
      expect(res.status).toBe(200);
      expect(res.body.shandies).toBeInstanceOf(Array);
      expect(res.body.count).toBeGreaterThan(0);
    });

    it("POST /api/v1/mandi/alerts allows user to subscribe to price alerts", async () => {
      const res = await request(app)
        .post("/api/v1/mandi/alerts")
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({
          commodity: "Kangayam Bull",
          market: "Anthiyur Shandy",
          thresholdPrice: 65000,
          channel: "SMS",
        });

      expect(res.status).toBe(201);
      expect(res.body.alert).toHaveProperty("id");
      const alertId = res.body.alert.id;

      // Check list
      const listRes = await request(app)
        .get("/api/v1/mandi/alerts")
        .set("Authorization", `Bearer ${buyerToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.alerts.some((a: any) => a.id === alertId)).toBe(true);

      // Clean up alert
      const delRes = await request(app)
        .delete(`/api/v1/mandi/alerts/${alertId}`)
        .set("Authorization", `Bearer ${buyerToken}`);
      expect(delRes.status).toBe(200);
    });
  });

  describe("PashuCare & Veterinary Health", () => {
    it("GET /api/v1/health/symptoms/bloat returns clinical guide with medical disclaimer", async () => {
      const res = await request(app).get("/api/v1/health/symptoms/bloat");
      expect(res.status).toBe(200);
      expect(res.body.guide.title).toContain("Bloat");
      expect(res.body.disclaimer).toContain("Informational only - consult a registered veterinarian");
      expect(res.body.guide.firstAid.length).toBeGreaterThan(0);
    });

    it("GET /api/v1/health/helpline returns emergency dispatch number", async () => {
      const res = await request(app).get("/api/v1/health/helpline");
      expect(res.status).toBe(200);
      expect(res.body.helpline).toBeDefined();
      expect(res.body.stateControlRooms).toBeInstanceOf(Array);
    });

    it("POST /api/v1/vet-requests creates a vet visit/consultation ticket", async () => {
      const res = await request(app)
        .post("/api/v1/vet-requests")
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({
          species: "COW",
          symptoms: "Lethargy and reduced feeding for 2 days after calving",
          photoUrls: [],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("ticketRef");
      expect(res.body.ticketRef).toMatch(/^DAH-VET-\d{4}-/);

      // List my vet requests
      const listRes = await request(app)
        .get("/api/v1/vet-requests")
        .set("Authorization", `Bearer ${buyerToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.requests.length).toBeGreaterThan(0);
    });
  });

  describe("Government Schemes & Subsidies", () => {
    it("GET /api/v1/schemes returns active subsidy schemes", async () => {
      const res = await request(app).get("/api/v1/schemes");
      expect(res.status).toBe(200);
      expect(res.body.schemes).toBeInstanceOf(Array);
      expect(res.body.count).toBeGreaterThan(0);
    });

    it("POST /api/v1/schemes/:id/apply submits facilitation application with reference", async () => {
      // First clean up any prior application by this test user for this scheme
      const me = await prisma.user.findUnique({ where: { phone: "+919000000004" } });
      await prisma.schemeApplication.deleteMany({
        where: { userId: me!.id, schemeId: sampleSchemeId },
      });

      const res = await request(app)
        .post(`/api/v1/schemes/${sampleSchemeId}/apply`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({ notes: "Requesting NABARD interest subvention for 2 HF cows." });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("applicationRef");
      expect(res.body.applicationRef).toMatch(/^DAH-SCH-\d{4}-/);

      // Verify list
      const listRes = await request(app)
        .get("/api/v1/schemes/user/my-applications")
        .set("Authorization", `Bearer ${buyerToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.applications.length).toBeGreaterThan(0);
    });
  });

  describe("Real Digital Passport PDF Generation", () => {
    it("GET /api/v1/listings/:id/passport.pdf streams a valid PDF with headers", async () => {
      const res = await request(app).get(`/api/v1/listings/${sampleListingId}/passport.pdf`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["content-disposition"]).toContain("inline; filename=");

      // Validate PDF Magic Number (%PDF-)
      const buffer = res.body;
      const pdfMagic = buffer.slice(0, 4).toString("utf-8");
      expect(pdfMagic).toBe("%PDF");
    });
  });
});
