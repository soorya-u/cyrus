import { authMutationKeys } from "@better-auth-ui/core";
import {
	type MagicLinkAuthClient,
	useAuth,
	useAuthPlugin,
	useSignInMagicLink,
} from "@better-auth-ui/react";
import { useIsMutating } from "@tanstack/react-query";
import { cn } from "cnfast";
import { type SyntheticEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MAGIC_LINK_SENT } from "@/constants/storage-keys";
import { magicLinkPlugin } from "@/lib/auth/plugins/magic-link-plugin";
import { ProviderButtons, type SocialLayout } from "./provider-buttons";

export type MagicLinkProps = {
	className?: string;
	socialLayout?: SocialLayout;
	socialPosition?: "top" | "bottom";
	callbackUrl?: string;
};

/**
 * Render a card-based sign-in form that sends an email magic link and optionally shows social provider buttons.
 *
 * @param className - Additional CSS class names applied to the card container
 * @param socialLayout - Layout style for social provider buttons
 * @param socialPosition - Position of social provider buttons; `"top"` or `"bottom"`. Defaults to `"bottom"`.
 * @returns The magic-link sign-in UI as a JSX element
 */
export function MagicLink({
	className,
	socialLayout,
	socialPosition = "bottom",
	callbackUrl,
}: MagicLinkProps) {
	const {
		authClient,
		basePaths,
		baseURL,
		localization,
		navigate,
		plugins,
		redirectTo,
		socialProviders,
	} = useAuth();
	const { localization: magicLinkLocalization, viewPaths: magicLinkViewPaths } =
		useAuthPlugin(magicLinkPlugin);

	const [email, setEmail] = useState("");

	const { mutate: signInMagicLink, isPending: signInMagicLinkPending } =
		useSignInMagicLink(authClient as MagicLinkAuthClient, {
			onSuccess: (_data, variables) => {
				sessionStorage.setItem(MAGIC_LINK_SENT, variables.email);
				navigate({
					to: `${basePaths.auth}/${magicLinkViewPaths.auth.magicLinkSent}`,
				});
			},
		});

	const signInMutating = useIsMutating({
		mutationKey: authMutationKeys.signIn.all,
	});
	const signUpMutating = useIsMutating({
		mutationKey: authMutationKeys.signUp.all,
	});
	const isPending = signInMutating + signUpMutating > 0;

	const [fieldErrors, setFieldErrors] = useState<{
		email?: string;
	}>({});

	const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		signInMagicLink({
			email,
			callbackURL: callbackUrl ?? `${baseURL}${redirectTo}`,
		});
	};

	const showSeparator = socialProviders && socialProviders.length > 0;

	return (
		<Card className={cn("w-full max-w-sm", className)}>
			<CardHeader>
				<CardTitle className="text-xl">{localization.auth.signIn}</CardTitle>
			</CardHeader>

			<CardContent>
				<div className="flex flex-col gap-6">
					{socialPosition === "top" && (
						<>
							{socialProviders && socialProviders.length > 0 && (
								<ProviderButtons
									callbackUrl={callbackUrl}
									socialLayout={socialLayout}
									view="magicLink"
								/>
							)}

							{showSeparator && (
								<FieldSeparator className="m-0 flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
									{localization.auth.or}
								</FieldSeparator>
							)}
						</>
					)}

					<form onSubmit={handleSubmit}>
						<FieldGroup>
							<Field data-invalid={!!fieldErrors.email}>
								<FieldLabel htmlFor="email">
									{localization.auth.email}
								</FieldLabel>

								<Input
									aria-invalid={!!fieldErrors.email}
									autoComplete="email"
									disabled={isPending}
									id="email"
									name="email"
									onChange={(e) => {
										setEmail(e.target.value);

										setFieldErrors((prev) => ({
											...prev,
											email: undefined,
										}));
									}}
									onInvalid={(e) => {
										e.preventDefault();

										setFieldErrors((prev) => ({
											...prev,
											email: (e.target as HTMLInputElement).validationMessage,
										}));
									}}
									placeholder={localization.auth.emailPlaceholder}
									required
									type="email"
									value={email}
								/>

								<FieldError>{fieldErrors.email}</FieldError>
							</Field>

							<div className="flex flex-col gap-3">
								<Button disabled={isPending} type="submit">
									{signInMagicLinkPending && <Spinner />}

									{magicLinkLocalization.sendMagicLink}
								</Button>

								{plugins.flatMap((plugin) =>
									(plugin.authButtons ?? []).map((AuthButton, index) => (
										<AuthButton
											key={`${plugin.id}-${index.toString()}`}
											view="magicLink"
										/>
									))
								)}
							</div>
						</FieldGroup>
					</form>

					{socialPosition === "bottom" && (
						<>
							{showSeparator && (
								<FieldSeparator className="flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
									{localization.auth.or}
								</FieldSeparator>
							)}

							{socialProviders && socialProviders.length > 0 && (
								<ProviderButtons
									callbackUrl={callbackUrl}
									socialLayout={socialLayout}
									view="magicLink"
								/>
							)}
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
