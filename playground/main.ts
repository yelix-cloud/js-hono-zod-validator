import z from "zod";
import { zodToType } from "../src/zodToType.ts";

const schema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().min(0).max(120),
  email: z.string().email(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string().length(5),
  }),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  profile: z.object({
    bio: z.string().max(500).optional(),
    website: z.string().url().optional(),
  }),
  preferences: z.enum(["dark", "light"]).optional(),
});

const ot = zodToType(schema);
console.log(ot); // { type: 'object', properties: { ... }, required: [ ... ] }
