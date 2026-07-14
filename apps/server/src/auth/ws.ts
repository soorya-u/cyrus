import { createWsTicketVerifier } from "@soorya-u/better-auth-ws-ticket/server";
import { env } from "../config/env";

/** Bound verifier for PartyServer `onBeforeConnect` — no `getSession`. */
export const wsTicketVerifier = createWsTicketVerifier({
	secret: env.BETTER_AUTH_SECRET,
});

/** Base subprotocol negotiated on upgrade (never the `ticket.*` token). */
export const WS_BASE_PROTOCOL = wsTicketVerifier.options.baseProtocol;
