import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { AppError } from "../utils/AppError";

// A reusable factory: give it a Zod schema and which part of the request to
// check (body / params / query), and it returns a middleware that validates
// that part BEFORE the controller ever sees the request. If validation
// fails, we throw a structured 400 error instead of letting bad data reach
// our business logic or database.
//
// Why validate on the server when the frontend form already validates?
// Because the frontend can be bypassed entirely — anyone can call the API
// directly with curl/Postman, skipping the browser form. Server-side
// validation is the real gate; frontend validation is just a nicer UX.
type RequestPart = "body" | "params" | "query";

export function validate(schema: ZodType, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || part}: ${issue.message}`)
        .join("; ");
      throw new AppError(400, "VALIDATION_ERROR", message);
    }

    // Replace with the parsed data (Zod can coerce/transform, e.g. string -> number)
    (req as any)[part] = result.data;
    next();
  };
}
