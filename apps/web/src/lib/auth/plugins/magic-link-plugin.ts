import { createAuthPlugin } from "@better-auth-ui/core";
import {
	magicLinkPlugin as coreMagicLinkPlugin,
	type MagicLinkPluginOptions,
} from "@better-auth-ui/core/plugins";

import { MagicLinkSent } from "@/components/auth/magic-link-sent";

export const magicLinkPlugin = createAuthPlugin(
	coreMagicLinkPlugin.id,
	(options?: MagicLinkPluginOptions) => ({
		...coreMagicLinkPlugin(options),
		views: { auth: { magicLinkSent: MagicLinkSent } },
	})
);
