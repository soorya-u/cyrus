import { rateLimit } from "elysia-rate-limit";

export const rateLimitPlugin = rateLimit({
	max: 100,
	duration: 60_000,
	skip: (request: Request) => new URL(request.url).pathname.startsWith("/docs"),
});
