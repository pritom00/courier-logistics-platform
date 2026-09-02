import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { sendError } from "../utils/apiResponse";

// Validates req.body / req.params / req.query against a Zod schema shaped
// as { body?, params?, query? }. On failure, responds with the project's
// standard structured error format instead of throwing.
export const validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (parsed.body) req.body = parsed.body;
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map((e) => ({
        field: e.path.slice(1).join("."),
        message: e.message,
      }));
      return sendError(res, "Validation failed", 422, errors);
    }
    next(err);
  }
};
