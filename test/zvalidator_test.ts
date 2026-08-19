import z from "zod";
import { assertEquals, assertExists } from "jsr:@std/assert";
import { YelixHono, openapi } from "@yelix/hono";
import { zValidatorYelix } from "../mod.ts";

Deno.test("zValidatorYelix exposes requestValidation metadata", () => {
  const schema = z.object({ name: z.string() });
  const mw = zValidatorYelix("json", schema);

  assertEquals(mw.name, "zValidator");
  assertEquals(mw.metadata._yelixKeys, ["requestValidation"]);
  assertEquals(mw.metadata.from, "json");
  assertExists(mw.metadata.schema?.["application/json"]?.schema);
});

Deno.test("zValidatorYelix rejects invalid JSON body with 400", async () => {
  const app = new YelixHono(undefined, { logger: false });

  app.post(
    "/items",
    openapi({ summary: "Create item" }),
    zValidatorYelix("json", z.object({ name: z.string().min(1) })),
    (c) => c.json({ ok: true }, 201),
  );

  const bad = await app.fetch(
    new Request("http://localhost/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    }),
  );
  assertEquals(bad.status, 400);

  const good = await app.fetch(
    new Request("http://localhost/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "widget" }),
    }),
  );
  assertEquals(good.status, 201);
});

Deno.test("zValidatorYelix query params appear in OpenAPI", () => {
  const app = new YelixHono(undefined, { logger: false });

  app.get(
    "/search",
    zValidatorYelix(
      "query",
      z.object({
        q: z.string(),
        page: z.number().optional(),
      }),
    ),
    (c) => c.json({ ok: true }),
  );

  const spec = app.getOpenAPI() as {
    paths?: Record<
      string,
      { get?: { parameters?: Array<{ name: string; in: string }> } }
    >;
  };

  const params = spec.paths?.["/search"]?.get?.parameters ?? [];
  assertEquals(params.some((p) => p.name === "q" && p.in === "query"), true);
});
