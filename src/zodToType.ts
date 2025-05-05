// deno-lint-ignore-file no-explicit-any
import { z, type ZodObject, type ZodSchema, type ZodTypeAny } from 'zod';
import type { parsePaths } from '../mod.ts';

export function schemaGenerator<T extends ZodSchema>(
  from: parsePaths,
  schema: T
): any {
  let oapiSchema: any = {};
  if (from === 'json') {
    const requerieds = getRequiredKeys(schema as unknown as ZodObject<any>);
    oapiSchema = {
      'application/json': {
        schema: zodToType(schema),
        required: requerieds,
      },
    };
  } else if (from === 'form') {
    oapiSchema = {
      'application/x-www-form-urlencoded': {
        schema: zodToType(schema),
      },
    };
  } else if (['query', 'header', 'cookie', 'path'].includes(from)) {
    oapiSchema = _generateParametersFromZodObject(
      schema as unknown as ZodObject<any>,
      from
    );
  } else {
    console.warn(
      `zValidatorYelix: The ${from} type is not supported. The only supported types are: json, form, query, header, cookie, and path.`
    );
  }

  return oapiSchema;
}

function _generateParametersFromZodObject(
  schema: ZodObject<any>,
  _in: string
): any[] {
  const shape = schema._def.shape();
  const parameters: any[] = [];

  for (const key in shape) {
    const prop = shape[key];
    const propSchema = zodToType(prop);
    parameters.push({
      name: key,
      in: _in,
      required: !prop.isOptional(),
      schema: propSchema,
    });
  }

  return parameters;
}

const getRequiredKeys = (schema: ZodObject<any>) => {
  const shape = schema._def.shape();
  return Object.entries(shape)
    .filter(
      ([, value]) => !(value as { isOptional?: () => boolean }).isOptional?.()
    )
    .map(([key]) => key);
};

export function zodToType(schema: ZodTypeAny): any {
  const def = schema._def;

  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodString: {
      interface StringSchema {
        type: string;
        minLength?: number;
        maxLength?: number;
        format?: string;
      }

      const stringSchema: StringSchema = { type: 'string' };
      if (def.checks) {
        for (const check of def.checks) {
          if (check.kind === 'min') stringSchema.minLength = check.value;
          if (check.kind === 'max') stringSchema.maxLength = check.value;
          if (check.kind === 'length') {
            stringSchema.minLength = check.value;
            stringSchema.maxLength = check.value;
          }
          if (check.kind === 'email') stringSchema.format = 'email';
          if (check.kind === 'url') stringSchema.format = 'uri';
          // ...add more if needed
        }
      }
      return stringSchema;
    }

    case z.ZodFirstPartyTypeKind.ZodNumber: {
      const numberSchema: any = { type: 'number' };
      if (def.checks) {
        for (const check of def.checks) {
          if (check.kind === 'min') numberSchema.minimum = check.value;
          if (check.kind === 'max') numberSchema.maximum = check.value;
        }
      }
      return numberSchema;
    }

    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return { type: 'boolean' };

    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = def.shape();
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const key in shape) {
        const prop = shape[key];
        const propSchema = zodToType(prop);
        properties[key] = propSchema;

        if (!prop.isOptional()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required, // Always include required array, even if empty
      };
    }

    case z.ZodFirstPartyTypeKind.ZodArray:
      return {
        type: 'array',
        items: zodToType(def.type),
      };

    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return { enum: [def.value] };

    case z.ZodFirstPartyTypeKind.ZodEnum:
      return {
        type: 'string',
        enum: def.values,
      };

    case z.ZodFirstPartyTypeKind.ZodUnion:
      return {
        oneOf: def.options.map(zodToType),
      };

    case z.ZodFirstPartyTypeKind.ZodNullable:
      return {
        ...zodToType(def.innerType),
        nullable: true,
      };

    case z.ZodFirstPartyTypeKind.ZodDate:
      return {
        type: 'string',
        format: 'date-time',
      };

    default:
      return { type: 'string' }; // Fallback
  }
}
