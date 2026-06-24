import { secureHeaders } from "hono/secure-headers";

export const securityMiddleware = secureHeaders({
	crossOriginOpenerPolicy: "same-origin-allow-popups",
});
