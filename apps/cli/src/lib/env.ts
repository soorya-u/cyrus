import { homedir } from "node:os";
import { join } from "node:path";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "CLI_PUBLIC_",
	// build time
	client: {
		CLI_PUBLIC_SERVER_URL: z.url(),
	},
	// runtime
	server: {
		CYRUS_HOME: z.string().default(join(homedir(), ".cyrus")),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
