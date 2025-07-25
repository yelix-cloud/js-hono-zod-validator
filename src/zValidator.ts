import { zValidator } from "@hono/zod-validator";
import { YelixHonoMiddleware } from "@yelix/hono";
import type { ZodSchema } from "zod";
import { schemaGenerator } from "./zodToType.ts";

/**
 * Defines the possible sources from which data can be parsed for validation.
 */
type parsePaths = "cookie" | "form" | "json" | "query" | "header" | "param";

/**
 * Creates a YelixHonoMiddleware instance for validating requests using Zod schemas.
 * @template T - The Zod schema type.
 * @param from - The source of the data to validate (e.g., 'json', 'query').
 * @param schema - The Zod schema to validate against.
 * @returns A YelixHonoMiddleware instance configured for request validation.
 */
function zValidatorYelix<T extends ZodSchema>(
  from: parsePaths,
  schema: T,
): YelixHonoMiddleware {
  const oapiSchema = schemaGenerator(from, schema);

  return new YelixHonoMiddleware("zValidator", zValidator(from, schema), {
    _yelixKeys: ["requestValidation"],
    from,
    zodSchema: schema,
    schema: oapiSchema,
  });
}

export { zValidatorYelix };
export type { parsePaths };
