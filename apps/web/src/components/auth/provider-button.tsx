import { authMutationKeys, getProviderName } from "@better-auth-ui/core";
import { providerIcons, useAuth, useSignInSocial } from "@better-auth-ui/react";
import { useIsMutating } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { SocialProvider } from "better-auth/social-providers";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { env } from "@/lib/env";

export type ProviderButtonProps = {
	provider: SocialProvider;
	display?: "full" | "name" | "icon";
	callbackUrl?: string;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children" | "disabled">;

export function ProviderButton({
	provider,
	callbackUrl,
	display = "full",
	variant = "outline",
	...props
}: ProviderButtonProps) {
	const { authClient, baseURL, localization, redirectTo } = useAuth();
	const navigate = useNavigate();

	const callbackURL = callbackUrl ?? `${baseURL}${redirectTo}`;

	const { mutate: signInSocial, isPending: signInSocialPending } =
		useSignInSocial(authClient);

	const ProviderIcon = providerIcons[provider];

	const signInMutating = useIsMutating({
		mutationKey: authMutationKeys.signIn.all,
	});
	const signUpMutating = useIsMutating({
		mutationKey: authMutationKeys.signUp.all,
	});
	const isPending = signInMutating + signUpMutating > 0;

	const node: { icon: ReactNode; label: ReactNode } = {
		icon: null,
		label: null,
	};

	if (signInSocialPending) {
		node.icon = <Spinner />;
	} else if (ProviderIcon) {
		node.icon = <ProviderIcon />;
	}

	if (display === "full") {
		node.label = localization.auth.continueWith.replace(
			"{{provider}}",
			getProviderName(provider)
		);
	} else if (display === "name") {
		node.label = getProviderName(provider);
	}

	return (
		<Button
			disabled={isPending}
			onClick={() => {
				signInSocial({ provider, callbackURL });
				if (env.VITE_IS_DESKTOP)
					navigate({ to: "/auth/desktop", search: { provider } });
			}}
			type="button"
			variant={variant}
			{...props}
			aria-label={getProviderName(provider)}
		>
			{node.icon}
			{node.label}
		</Button>
	);
}
