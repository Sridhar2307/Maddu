import { z } from "zod";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================
export const UserRole = {
  BUYER: "BUYER",
  SELLER: "SELLER",
  VET: "VET",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const SellerStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type SellerStatus = (typeof SellerStatus)[keyof typeof SellerStatus];

export const ListingCategory = {
  CATTLE: "CATTLE",
  BUFFALO: "BUFFALO",
  GOAT: "GOAT",
  SHEEP: "SHEEP",
  POULTRY: "POULTRY",
} as const;
export type ListingCategory = (typeof ListingCategory)[keyof typeof ListingCategory];

export const ListingStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  SOLD: "SOLD",
  REMOVED: "REMOVED",
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const OrderStatus = {
  CREATED: "CREATED",
  PAID_ESCROW: "PAID_ESCROW",
  DISPATCHED: "DISPATCHED",
  DELIVERED: "DELIVERED",
  RELEASED: "RELEASED",
  DISPUTED: "DISPUTED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const VehicleType = {
  BOLERO: "BOLERO",
  TRUCK_6WHEEL: "TRUCK_6WHEEL",
  ISLAND_VESSEL: "ISLAND_VESSEL",
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

// Southern states + UTs IDs
export const SouthernRegionId = {
  TN: "TN",
  AP: "AP",
  TG: "TG",
  KA: "KA",
  KL: "KL",
  PY: "PY",
  AN: "AN",
  LD: "LD",
} as const;
export type SouthernRegionId = (typeof SouthernRegionId)[keyof typeof SouthernRegionId];

// ============================================================================
// AUTH & USER SCHEMAS
// ============================================================================
export const phoneRegex = /^\+?[0-9]{10,13}$/;

export const sendOtpSchema = z.object({
  phone: z.string().trim().regex(phoneRegex, "Invalid phone number format (e.g. +919842100000 or 9842100000)"),
});
export type SendOtpInput = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: z.string().trim().regex(phoneRegex, "Invalid phone number"),
  otp: z.string().trim().length(6, "OTP must be exactly 6 digits"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60).optional(),
  state: z.string().max(4).optional(),
  district: z.string().max(80).optional(),
  language: z.enum(["en", "ta", "te", "kn", "ml", "hi"]).optional(),
  role: z.enum(["BUYER", "SELLER"]).optional(),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  state: z.string().max(4).optional(),
  district: z.string().max(80).optional(),
  language: z.enum(["en", "ta", "te", "kn", "ml", "hi"]).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const sellerApplicationSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  village: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(80),
  stateId: z.enum(["TN", "AP", "TG", "KA", "KL", "PY", "AN", "LD"]),
  idProofUrl: z.string().url().optional(),
});
export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;

// ============================================================================
// LISTINGS SCHEMAS
// ============================================================================
export const createListingSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  category: z.enum(["CATTLE", "BUFFALO", "GOAT", "SHEEP", "POULTRY"]),
  breed: z.string().trim().min(2).max(60),
  stateId: z.enum(["TN", "AP", "TG", "KA", "KL", "PY", "AN", "LD"]),
  district: z.string().trim().min(2).max(80),
  price: z.number().int().positive("Price must be a positive integer in ₹"),
  ageMonths: z.number().int().min(1).max(240).default(36),
  dailyYield: z.number().min(0).max(50).default(0),
  lactation: z.number().int().min(0).max(12).default(0),
  pregnancyStatus: z.string().max(100).default("Not Pregnant"),
  estimatedWeight: z.number().positive().default(300),
  heartGirthCm: z.number().min(30).max(300).optional(),
  bodyLengthCm: z.number().min(30).max(250).optional(),
  earTagId: z.string().trim().max(40).optional(),
  diet: z.string().max(300).default("Green grass, dry straw, mineral mixture"),
  description: z.string().max(1000).default(""),
  imageUrls: z.array(z.string().url()).max(5).default([]),
  legalComplianceConfirmed: z.boolean().refine(val => val === true, {
    message: "You must confirm compliance with livestock transport and animal welfare laws"
  })
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = createListingSchema.partial().omit({ legalComplianceConfirmed: true }).extend({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "SOLD", "REMOVED"]).optional()
});
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

export const listingQuerySchema = z.object({
  stateId: z.string().optional(),
  breed: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
});
export type ListingQueryParams = z.infer<typeof listingQuerySchema>;

// ============================================================================
// ORDERS & ESCROW SCHEMAS
// ============================================================================
export const createOrderSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  notes: z.string().max(300).optional(),
  legalComplianceConfirmed: z.boolean().refine(val => val === true, {
    message: "You must confirm compliance with animal welfare and checkpost laws"
  })
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const disputeOrderSchema = z.object({
  reason: z.string().trim().min(10, "Please provide detailed reason for dispute (at least 10 characters)").max(500),
});
export type DisputeOrderInput = z.infer<typeof disputeOrderSchema>;

// ============================================================================
// LOGISTICS & FREIGHT SCHEMAS
// ============================================================================
export const freightQuoteSchema = z.object({
  fromDistrict: z.string().min(2),
  toDistrict: z.string().min(2),
  km: z.number().int().min(10).max(2000),
  vehicleType: z.enum(["BOLERO", "TRUCK_6WHEEL", "ISLAND_VESSEL"]),
});
export type FreightQuoteInput = z.infer<typeof freightQuoteSchema>;

export const createTruckBookingSchema = freightQuoteSchema.extend({
  orderId: z.string().optional(),
  pickupDate: z.string().min(8),
  contactPhone: z.string().regex(phoneRegex),
});
export type CreateTruckBookingInput = z.infer<typeof createTruckBookingSchema>;

// ============================================================================
// MANDI & ALERTS SCHEMAS
// ============================================================================
export const createMandiAlertSchema = z.object({
  commodity: z.string().min(2).max(80),
  market: z.string().max(80).optional(),
  thresholdPrice: z.number().positive().optional(),
  channel: z.enum(["SMS", "WHATSAPP"]).default("SMS"),
});
export type CreateMandiAlertInput = z.infer<typeof createMandiAlertSchema>;

// ============================================================================
// PASHUCARE VET SCHEMAS
// ============================================================================
export const createVetRequestSchema = z.object({
  symptoms: z.string().min(5).max(1000),
  species: z.enum(["COW", "BUFFALO", "GOAT", "SHEEP", "POULTRY"]).default("COW"),
  photoUrls: z.array(z.string().url()).max(3).default([]),
});
export type CreateVetRequestInput = z.infer<typeof createVetRequestSchema>;

// ============================================================================
// API ERROR INTERFACE
// ============================================================================
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
