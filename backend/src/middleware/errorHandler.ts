import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

// Express recognizes this as an error handler specifically because it takes
// 4 arguments (err, req, res, next). It must be registered LAST, after all
// routes — Express routes any error passed to next(err) here.
//
// The whole point: never leak raw stack traces or internal error messages to
// the client (that can expose file paths, library versions, etc. to an
// attacker). Always return the same JSON shape.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Anything we didn't throw on purpose (a bug, a library error) — log it
  // for ourselves, but show the client only a generic message.
  console.error("Unexpected error:", err);
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
  });
}

// Catches requests to routes that don't exist (e.g. GET /api/nonsense)
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `No route: ${req.method} ${req.originalUrl}` },
  });
}
