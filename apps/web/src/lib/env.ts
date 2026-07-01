import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
		VITE_IS_DESKTOP: z.preprocess(
			() => typeof window !== "undefined" && !!window.__electrobunWebviewId,
			z.boolean()
		),
	},
	runtimeEnv: import.meta.env as Record<
		string,
		string | number | boolean | undefined
	>,
	emptyStringAsUndefined: true,
});
