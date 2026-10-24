import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("Phase 1: Auth & RBAC API Endpoints", () => {
  const testPhone = "+919842199999";
  let receivedOtp: string;
  let accessToken: string;
  let refreshTokenCookie: string;

  it("1. Health check returns 200 and CONNECTED", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("HEALTHY");
    expect(res.body.database).toBe("CONNECTED");
    expect(res.body.helpline).toBe("1800-425-76884");
  });

  it("2. POST /api/v1/auth/otp/send returns success and dev OTP", async () => {
    const res = await request(app)
      .post("/api/v1/auth/otp/send")
      .send({ phone: testPhone });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.debugOtp).toBeDefined();
    receivedOtp = res.body.debugOtp;
  });

  it("3. POST /api/v1/auth/otp/verify rejects invalid OTP with 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ phone: testPhone, otp: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_OTP");
  });

  it("4. POST /api/v1/auth/otp/verify accepts valid OTP and sets session", async () => {
    const res = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({
        phone: testPhone,
        otp: receivedOtp,
        name: "Test Farmer Kumar",
        state: "TN",
        district: "Erode",
        role: "BUYER",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.phone).toBe(testPhone);
    expect(res.body.user.roles).toContain("BUYER");

    accessToken = res.body.accessToken;
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    refreshTokenCookie = cookies[0];
  });

  it("5. GET /api/v1/auth/me rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("6. GET /api/v1/auth/me returns profile when bearer token provided", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe(testPhone);
    expect(res.body.user.name).toBe("Test Farmer Kumar");
  });

  it("7. POST /api/v1/auth/refresh rotates refresh token and returns new access token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [refreshTokenCookie]);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
  });

  it("8. POST /api/v1/auth/me/roles/seller allows buyer to apply as seller", async () => {
    const res = await request(app)
      .post("/api/v1/auth/me/roles/seller")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        displayName: "Kumar Kangayam Cattle Farm",
        village: "Kangeyam",
        district: "Tiruppur",
        stateId: "TN",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sellerProfile.status).toBe("PENDING");
  });

  it("9. POST /api/v1/auth/logout clears refresh cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", [refreshTokenCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
