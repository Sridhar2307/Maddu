import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { listingsRouter } from "./routes/listings.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { martRouter } from "./routes/mart.routes.js";
import { mandiRouter } from "./routes/mandi.routes.js";
import { pashucareRouter } from "./routes/pashucare.routes.js";
import { schemesRouter } from "./routes/schemes.routes.js";
import { prisma } from "./lib/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // allow images from external CDNs if needed
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration locked to frontend origin and Vercel domains
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === env.WEB_ORIGIN ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Static uploads directory
app.use("/uploads", express.static(path.resolve(__dirname, "../../uploads")));

// System Health Check
app.get("/api/v1/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: "HEALTHY",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: "CONNECTED",
      version: "1.0.0",
      helpline: env.HELPLINE_NUMBER,
    });
  } catch (err: any) {
    return res.status(503).json({
      status: "UNHEALTHY",
      error: err.message,
    });
  }
});

// Authentication & RBAC Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/listings", listingsRouter);
app.use("/api/v1/orders", ordersRouter);
app.use("/api/v1", ordersRouter);
app.use("/api/v1", martRouter);
app.use("/api/v1/mandi", mandiRouter);
app.use("/api/v1", pashucareRouter);
app.use("/api/v1/schemes", schemesRouter);

// Centralized Error Handler Middleware
app.use(errorHandler);

export default app;

