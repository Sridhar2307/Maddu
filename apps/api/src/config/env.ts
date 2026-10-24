import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  JWT_ACCESS_SECRET: z.string().min(16).default("dakshin_dev_access_secret_32_characters_long_min"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dakshin_dev_refresh_secret_32_characters_long_min"),
  ACCESS_TOKEN_EXPIRY: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRY: z.string().default("30d"),
  HELPLINE_NUMBER: z.string().default("1800-425-76884"),
  SMS_PROVIDER: z.enum(["MOCK", "MSG91", "TWILIO"]).default("MOCK"),
  RAZORPAY_KEY_ID: z.string().default("rzp_test_mock_dakshin_key"),
  RAZORPAY_KEY_SECRET: z.string().default("rzp_test_mock_secret_dakshin"),
  RAZORPAY_WEBHOOK_SECRET: z.string().default("rzp_webhook_secret_dakshin"),
  DATA_GOV_IN_API_KEY: z.string().default(""),
  UPLOAD_DIR: z.string().default("./uploads"),
});

export const env = envSchema.parse(process.env);
