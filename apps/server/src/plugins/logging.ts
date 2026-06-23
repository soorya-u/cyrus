import { auth } from "@cyrus/auth";
import { Elysia } from "elysia";
import { createAuthMiddleware } from "evlog/better-auth";
import { evlog } from "evlog/elysia";

const identifyUser = createAuthMiddleware(auth, {
	exclude: ["/api/auth/**"],
	maskEmail: true,
});
export const loggingPlugin = new Elysia()
	.use(evlog())
	.derive(async ({ request, log }) => {
		await identifyUser(log, request.headers, new URL(request.url).pathname);
		return {};
	});
