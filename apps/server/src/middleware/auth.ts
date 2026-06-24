import type { MiddlewareHandler } from "hono";
import { auth } from "../auth";

export interface BetterAuthVariables {
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}

export const authMiddleware: MiddlewareHandler<BetterAuthVariables> = async (
	ctx,
	next
) => {
	const session = await auth.api.getSession({ headers: ctx.req.raw.headers });
	ctx.set("user", session ? session.user : null);
	ctx.set("session", session ? session.session : null);
	await next();
};
