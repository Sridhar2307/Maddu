import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  fields?: Record<string, string>;
}

export function errorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  // Handle Zod Validation Errors
  if (err instanceof ZodError || err.name === "ZodError" || (err as any).issues) {
    const fields: Record<string, string> = {};
    const issues = (err as any).errors || (err as any).issues || [];
    issues.forEach((issue: any) => {
      const path = issue.path?.join(".") || "root";
      fields[path] = issue.message;
    });

    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        fields,
      },
    });
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "ERROR");
  const message =
    statusCode === 500 && env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err.message || "An error occurred";

  logger.error(
    {
      err,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      statusCode,
    },
    message
  );

  return res.status(statusCode).json({
    error: {
      code,
      message,
      fields: err.fields,
    },
  });
}
