// deno-lint-ignore-file no-explicit-any
import { z, type ZodObject, type ZodSchema, type ZodTypeAny } from "zod";
import type { parsePaths } from "../mod.ts";

export function schemaGenerator<T extends ZodSchema>(
  from: parsePaths,
  schema: T,
): any {
  let oapiSchema: any = {};
  if (from === "json") {
    const requerieds = getRequiredKeys(schema as unknown as ZodObject<any>);
    oapiSchema = {
      "application/json": {
        schema: {
          ...zodToType(schema),
          required: requerieds,
        },
      },
    };
  } else if (from === "form") {
    oapiSchema = {
      "application/x-www-form-urlencoded": {
        schema: zodToType(schema),
      },
    };
  } else if (["query", "header", "cookie", "param"].includes(from)) {
    oapiSchema = _generateParametersFromZodObject(
      schema as unknown as ZodObject<any>,
      from,
    );
  } else {
    console.warn(
      `zValidatorYelix: The ${from} type is not supported. The only supported types are: json, form, query, header, cookie, and param.`,
    );
  }

  return oapiSchema;
}

function _generateParametersFromZodObject(
  schema: ZodObject<any>,
  _in: string,
): any[] {
  const shape = schema.shape;
  const parameters: any[] = [];

  for (const key in shape) {
    const prop = shape[key];
    const propSchema = zodToType(prop);
    parameters.push({
      name: key,
      in: _in,
      required: !prop.isOptional() && !(prop instanceof z.ZodDefault),
      schema: propSchema,
    });
  }

  return parameters;
}

const getRequiredKeys = (schema: ZodObject<any>) => {
  const shape = schema.shape;
  return Object.entries(shape)
    .filter(
      ([, value]) => {
        const val = value as any;
        // A field is required if it's not optional and doesn't have a default value
        return !val.isOptional?.() && !(val instanceof z.ZodDefault);
      },
    )
    .map(([key]) => key);
};

export function zodToType(schema: ZodTypeAny): any {
  const def = schema.def as any; // Use any to access the dynamic properties

  // Use instanceof checks instead of typeName comparisons
  if (schema instanceof z.ZodString) {
    interface StringSchema {
      type: string;
      minLength?: number;
      maxLength?: number;
      format?: string;
    }

    const stringSchema: StringSchema = { type: "string" };
    if (def.checks) {
      for (const check of def.checks) {
        // Handle the new check structure in Zod v4
        if (check.constructor.name === "$ZodCheckMinLength") {
          stringSchema.minLength = (check as any)._zod?.def?.minimum;
        } else if (check.constructor.name === "$ZodCheckMaxLength") {
          stringSchema.maxLength = (check as any)._zod?.def?.maximum;
        } else if (check.constructor.name === "$ZodCheckLengthEquals") {
          const length = (check as any)._zod?.def?.length;
          stringSchema.minLength = length;
          stringSchema.maxLength = length;
        } else if (check instanceof z.ZodEmail) {
          stringSchema.format = "email";
        } else if (check instanceof z.ZodURL) {
          stringSchema.format = "uri";
        } else if (check.constructor.name === "$ZodCheckRegex") {
          // Handle regex patterns
          const pattern = (check as any)._zod?.def?.pattern;
          if (pattern) {
            (stringSchema as any).pattern = pattern.source;
          }
        }
        // Add more checks as needed
      }
    }
    return stringSchema;
  }

  if (schema instanceof z.ZodNumber) {
    const numberSchema: any = { type: "number" };
    if (def.checks) {
      for (const check of def.checks) {
        if (check.constructor.name === "$ZodCheckGreaterThan") {
          numberSchema.minimum = (check as any)._zod?.def?.value;
        } else if (check.constructor.name === "$ZodCheckLessThan") {
          numberSchema.maximum = (check as any)._zod?.def?.value;
        }
      }
    }
    return numberSchema;
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }

  if (schema instanceof z.ZodObject) {
    const shape = (schema as any).shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const key in shape) {
      const prop = shape[key];
      const propSchema = zodToType(prop);
      properties[key] = propSchema;

      // A field is required if it's not optional and doesn't have a default value
      if (!prop.isOptional() && !(prop instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required: required, // Always include required array, even if empty
    };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      items: zodToType(def.element),
    };
  }

  if (schema instanceof z.ZodLiteral) {
    // In Zod v4, literal values are stored in def.values array
    return { enum: def.values || [def.value] };
  }

  if (schema instanceof z.ZodEnum) {
    // In Zod v4, enum structure changed to use entries
    const values = Object.values(def.entries);
    return {
      type: "string",
      enum: values,
    };
  }

  if (schema instanceof z.ZodUnion) {
    return {
      oneOf: def.options.map(zodToType),
    };
  }

  if (schema instanceof z.ZodNullable) {
    return {
      ...zodToType(def.innerType),
      nullable: true,
    };
  }

  if (schema instanceof z.ZodOptional) {
    // Handle ZodOptional by processing the inner type
    return zodToType(def.innerType);
  }

  if (schema instanceof z.ZodDefault) {
    // Handle ZodDefault - schemas with default values
    const innerSchema = zodToType(def.innerType);
    return {
      ...innerSchema,
      default: def.defaultValue, // Add the default value to OpenAPI schema
    };
  }

  if (schema instanceof z.ZodDate) {
    return {
      type: "string",
      format: "date-time",
    };
  }

  // Fallback for any unhandled types
  return { type: "string" };
}
