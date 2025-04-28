# zValidator Abstractor

The `zValidator` abstractor is a utility for validating HTTP requests using [Zod](https://github.com/colinhacks/zod) schemas in conjunction with the [Hono](https://hono.dev/) framework. It simplifies request validation by providing a middleware that integrates seamlessly with Yelix's Hono-based abstractions.

## Features

- Validate request data from various sources (`json`, `query`, `header`, etc.).
- Leverages the power of Zod schemas for type-safe validation.
- Easily integrates with Yelix's Hono middleware ecosystem.

## Installation

To use the `zValidator` abstractor:

```bash
deno add jsr:@yelix/zod-validator
```

## Usage

Here's an example of how to use the `zValidator` abstractor in your Hono application:

```ts
import { z } from 'zod';
import { zValidatorYelix } from '@yelix/zod-validator';

const schema = z.object({
  name: z.string(),
  age: z.number().min(18),
});

const validateMiddleware = zValidatorYelix('json', schema);

// Use the middleware in your Hono route
app.post('/user', validateMiddleware, (c) => {
  const data = c.req.validatedData;
  return c.json({ message: 'Validation successful', data });
});
```

## License

This project is licensed under the MIT License.
