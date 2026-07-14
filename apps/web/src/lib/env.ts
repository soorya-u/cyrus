import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const runtimeEnv = import.meta.env as Record<
	string,
	string | number | boolean | undefined
>;

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		/** Worker origin for PartySocket / signaling. */
		VITE_SERVER_URL: z.url(),
		VITE_APP_URL: z.preprocess((value) => {
			if (typeof value === "string" && value.length > 0) return value;
			if (typeof window !== "undefined") return window.location.origin;
			return runtimeEnv.VITE_SERVER_URL;
		}, z.url()),
		VITE_IS_DESKTOP: z.preprocess(
			() => typeof window !== "undefined" && !!window.__electrobunWebviewId,
			z.boolean()
		),
	},
	runtimeEnv,
	emptyStringAsUndefined: true,
});
