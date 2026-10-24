import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

// Razorpay instance in test mode
export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export async function createRazorpayOrder(orderId: string, amountInRupees: number) {
  const amountInPaise = amountInRupees * 100;
  
  // In dev / test with mock keys, generate a deterministic mock Razorpay order
  if (env.RAZORPAY_KEY_ID.includes("mock") || env.NODE_ENV === "test") {
    return {
      id: `order_mock_${crypto.randomBytes(8).toString("hex")}`,
      entity: "order",
      amount: amountInPaise,
      amount_paid: 0,
      amount_due: amountInPaise,
      currency: "INR",
      receipt: orderId,
      status: "created",
    };
  }

  return await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: orderId,
    notes: {
      platform: "DakshinAgriHub",
      orderId,
    },
  });
}

export function verifyWebhookSignature(bodyString: string, signature: string): boolean {
  if (env.NODE_ENV === "test" || env.RAZORPAY_WEBHOOK_SECRET.includes("mock")) {
    return true;
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(bodyString)
    .digest("hex");

  return expectedSignature === signature;
}

export function calculateServerFreight(km: number, vehicleType: string): {
  ratePerKm: number;
  baseCost: number;
  checkpostPermitFee: number;
  totalCost: number;
  transitHours: string;
} {
  let ratePerKm = 28;
  let checkpostPermitFee = 350;
  let speedKmH = 35;

  if (vehicleType === "TRUCK_6WHEEL") {
    ratePerKm = 48;
    checkpostPermitFee = 500;
    speedKmH = 30;
  } else if (vehicleType === "ISLAND_VESSEL") {
    ratePerKm = 65;
    checkpostPermitFee = 1200; // port quarantine and marine container clearance
    speedKmH = 15;
  }

  const baseCost = km * ratePerKm;
  const totalCost = baseCost + checkpostPermitFee;
  const transitHours = (km / speedKmH + (vehicleType === "ISLAND_VESSEL" ? 12 : 0.5)).toFixed(1);

  return {
    ratePerKm,
    baseCost,
    checkpostPermitFee,
    totalCost,
    transitHours: `${transitHours} Hours`,
  };
}
