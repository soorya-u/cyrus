import {
	isTwoFactorRedirect,
	parseTwoFactorMethods,
} from "@better-auth-ui/core/plugins";
import { useAuth } from "@better-auth-ui/react";
import { useCallback } from "react";
import {
	TWO_FACTOR_PLUGIN_ID,
	useTwoFactorMethodsStore,
} from "@/stores/two-factor-methods";
import { resolvePostSignInRedirect } from "@/utils/callback";

/** Successful email/password sign-in session payload from Better Auth. */
type SignInSessionData = {
	token: string;
	user: { id: string };
};

export function useSignInContinuation() {
	const { basePaths, navigate, plugins, redirectTo } = useAuth();

	const twoFactorPath = plugins.find(
		(plugin) => plugin.id === TWO_FACTOR_PLUGIN_ID
	)?.viewPaths?.auth?.twoFactor;

	return useCallback(
		(data: SignInSessionData) => {
			const redirectTarget = resolvePostSignInRedirect(
				window.location.search,
				redirectTo
			);

			if (twoFactorPath && isTwoFactorRedirect(data)) {
				useTwoFactorMethodsStore
					.getState()
					.setMethods(parseTwoFactorMethods(data.twoFactorMethods));

				navigate({
					to: `${basePaths.auth}/${twoFactorPath}?redirectTo=${encodeURIComponent(redirectTarget)}`,
				});
				return;
			}

			navigate({ to: redirectTarget });
		},
		[basePaths.auth, navigate, redirectTo, twoFactorPath]
	);
}
