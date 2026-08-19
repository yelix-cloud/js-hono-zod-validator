// deno-lint-ignore-file no-explicit-any
import { z, type ZodObject, type ZodSchema, type ZodTypeAny } from "zod";
import type { parsePaths } from "../mod.ts";

export function schemaGenerator<T extends ZodSchema>(
  from: parsePaths,
  schema: T,
): any {
  let oapiSchema: any = {};
  if (from === "json") {
    oapiSchema = {
      "application/json": {
        schema: zodToType(schema),
      },
    };
  } else if (from === "form") {
    oapiSchema = {
      "multipart/form-data": {
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

  const openApiIn = _in === "param" ? "path" : _in;

  for (const key in shape) {
    const prop = shape[key];
    const propSchema = zodToType(prop);
    parameters.push({
      name: key,
      in: openApiIn,
      required: !prop.isOptional() && !(prop instanceof z.ZodDefault),
      schema: propSchema,
    });
  }

  return parameters;
}

export function zodToType(schema: ZodTypeAny): any {
  const jsonSchema = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  }) as Record<string, unknown> & { $schema?: string };
  const { $schema: _schema, ...rest } = jsonSchema;
  return rest;
}
