import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "ELECTROBUN_",
	client: {
		ELECTROBUN_WEB_APP_URL: z.url(),
		ELECTROBUN_SERVER_URL: z.url(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
