import {
	type AuthView,
	authMutationKeys,
	getProviderName,
} from "@better-auth-ui/core";
import { providerIcons, useAuth, useSignInSocial } from "@better-auth-ui/react";
import { useIsMutating } from "@tanstack/react-query";
import type { SocialProvider } from "better-auth/social-providers";
import { cn } from "cnfast";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LastUsedBadge } from "./last-login-method/last-used-badge";

export type ProviderButtonProps = {
	provider: SocialProvider;
	display?: "full" | "name" | "icon";
	view?: AuthView;
	/** Overrides `AuthProvider`'s app-wide `redirectTo` for this sign-in, e.g. to return to a specific flow (device authorization) instead of the default landing page. */
	callbackUrl?: string;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children" | "disabled">;

/**
 * Social provider sign-in button.
 *
 * @param provider - Provider to sign in with.
 * @param display - `"full"` (e.g. "Continue with Google"), `"name"` (just the provider name), or `"icon"` (icon only).
 * @param callbackUrl - Per-call redirect override; defaults to `AuthProvider`'s `redirectTo`.
 */
export function ProviderButton({
	provider,
	display = "full",
	view = "signIn",
	variant = "outline",
	className,
	callbackUrl,
	...props
}: ProviderButtonProps) {
	const { authClient, baseURL, localization, redirectTo } = useAuth();

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

	let label: ReactNode = null;
	if (display === "full") {
		label = localization.auth.continueWith.replace(
			"{{provider}}",
			getProviderName(provider)
		);
	} else if (display === "name") {
		label = getProviderName(provider);
	}

	return (
		<Button
			className={cn("relative overflow-visible", className)}
			disabled={isPending}
			onClick={() => signInSocial({ provider, callbackURL })}
			type="button"
			variant={variant}
			{...props}
		>
			{signInSocialPending && <Spinner />}
			{!signInSocialPending && ProviderIcon && <ProviderIcon />}

			{label}

			{display === "icon" && (
				<span className="sr-only">{getProviderName(provider)}</span>
			)}

			{view !== "signUp" && <LastUsedBadge floating method={provider} />}
		</Button>
	);
}
