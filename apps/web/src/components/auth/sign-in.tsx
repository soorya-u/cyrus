import { authMutationKeys } from "@better-auth-ui/core";
import {
	AuthPrompts,
	useAuth,
	useFetchOptions,
	useSignInEmail,
} from "@better-auth-ui/react";
import { useIsMutating } from "@tanstack/react-query";
import { cn } from "cnfast";
import { Eye, EyeOff } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
import { useSignInContinuation } from "@/auth/use-sign-in-continuation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { LastUsedBadge } from "./last-login-method/last-used-badge";
import { ProviderButtons, type SocialLayout } from "./provider-buttons";

export type SignInProps = {
	className?: string;
	socialLayout?: SocialLayout;
	socialPosition?: "top" | "bottom";
};

/**
 * Render the sign-in form UI with email/password, magic link, and social provider options.
 *
 * @param className - Optional additional container class names
 * @param socialLayout - Layout style for social provider buttons
 * @param socialPosition - Position of social provider buttons; `"top"` or `"bottom"`. Defaults to `"bottom"`.
 * @returns The rendered sign-in UI as a JSX element
 */
export function SignIn({
	className,
	socialLayout,
	socialPosition = "bottom",
}: SignInProps) {
	const {
		authClient,
		basePaths,
		emailAndPassword,
		localization,
		plugins,
		socialProviders,
		viewPaths,
		navigate,
		Link,
	} = useAuth();

	const { fetchOptions, resetFetchOptions } = useFetchOptions();
	const continueSignIn = useSignInContinuation();

	const [password, setPassword] = useState("");

	const { mutate: signInEmail, isPending: signInEmailPending } = useSignInEmail(
		authClient,
		{
			onError: (error, { email }) => {
				setPassword("");

				if (error.error?.code === "EMAIL_NOT_VERIFIED") {
					sessionStorage.setItem("better-auth-ui.verify-email", email);
					navigate({
						to: `${basePaths.auth}/${viewPaths.auth.verifyEmail}`,
					});
				}

				resetFetchOptions();
			},
			onSuccess: (data) => continueSignIn(data),
		}
	);

	const signInMutating = useIsMutating({
		mutationKey: authMutationKeys.signIn.all,
	});
	const signUpMutating = useIsMutating({
		mutationKey: authMutationKeys.signUp.all,
	});
	const isPending = signInMutating + signUpMutating > 0;

	const Captcha = plugins.find(
		(plugin) => plugin.captchaComponent
	)?.captchaComponent;

	const [isPasswordVisible, setIsPasswordVisible] = useState(false);

	const [fieldErrors, setFieldErrors] = useState<{
		email?: string;
		password?: string;
	}>({});

	const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const rememberMe = formData.get("rememberMe") === "on";

		signInEmail({
			email,
			password,
			...(emailAndPassword?.rememberMe ? { rememberMe } : {}),
			fetchOptions,
		});
	};

	const showSeparator =
		emailAndPassword?.enabled && socialProviders && socialProviders.length > 0;

	return (
		<Card className={cn("w-full max-w-sm", className)}>
			<AuthPrompts view="signIn" />
			<CardHeader>
				<CardTitle className="font-semibold text-xl">
					{localization.auth.signIn}
				</CardTitle>
			</CardHeader>

			<CardContent>
				<div className="flex flex-col gap-6">
					{socialPosition === "top" && (
						<>
							{socialProviders && socialProviders.length > 0 && (
								<ProviderButtons socialLayout={socialLayout} view="signIn" />
							)}

							{showSeparator && (
								<FieldSeparator className="m-0 flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
									{localization.auth.or}
								</FieldSeparator>
							)}
						</>
					)}

					{emailAndPassword?.enabled && (
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
										onChange={() => {
											setFieldErrors((prev) => ({
												...prev,
												email: undefined,
											}));
										}}
										onInvalid={(e) => {
											e.preventDefault();
											const el = e.target as HTMLInputElement;
											const msg = el.validity.valueMissing
												? localization.auth.fieldRequired
												: localization.auth.invalidEmail;

											setFieldErrors((prev) => ({
												...prev,
												email: msg,
											}));
										}}
										placeholder={localization.auth.emailPlaceholder}
										required
										type="email"
									/>

									<FieldError>{fieldErrors.email}</FieldError>
								</Field>

								<Field data-invalid={!!fieldErrors.password}>
									<FieldLabel htmlFor="password">
										{localization.auth.password}
									</FieldLabel>

									<InputGroup>
										<InputGroupInput
											aria-invalid={!!fieldErrors.password}
											autoComplete="current-password"
											disabled={isPending}
											id="password"
											maxLength={emailAndPassword?.maxPasswordLength}
											minLength={emailAndPassword?.minPasswordLength}
											name="password"
											onChange={(e) => {
												setPassword(e.target.value);

												setFieldErrors((prev) => ({
													...prev,
													password: undefined,
												}));
											}}
											onInvalid={(e) => {
												e.preventDefault();
												const el = e.target as HTMLInputElement;
												const min = emailAndPassword?.minPasswordLength;
												const max = emailAndPassword?.maxPasswordLength;

												let msg = localization.auth.fieldRequired;
												if (!el.validity.valueMissing) {
													msg = el.validity.tooShort
														? localization.auth.tooShort.replace(
																"{{min}}",
																String(min)
															)
														: localization.auth.tooLong.replace(
																"{{max}}",
																String(max)
															);
												}

												setFieldErrors((prev) => ({
													...prev,
													password: msg,
												}));
											}}
											placeholder={localization.auth.passwordPlaceholder}
											required
											type={isPasswordVisible ? "text" : "password"}
											value={password}
										/>

										<InputGroupAddon align="inline-end">
											<InputGroupButton
												aria-label={
													isPasswordVisible
														? localization.auth.hidePassword
														: localization.auth.showPassword
												}
												onClick={() => {
													setIsPasswordVisible((visible) => !visible);
												}}
												size="icon-xs"
												title={
													isPasswordVisible
														? localization.auth.hidePassword
														: localization.auth.showPassword
												}
											>
												{isPasswordVisible ? <EyeOff /> : <Eye />}
											</InputGroupButton>
										</InputGroupAddon>
									</InputGroup>

									<FieldError>{fieldErrors.password}</FieldError>
								</Field>

								{emailAndPassword.rememberMe && (
									<Field className="my-1">
										<div className="flex items-center gap-3">
											<Checkbox
												disabled={isPending}
												id="rememberMe"
												name="rememberMe"
											/>

											<FieldLabel
												className="cursor-pointer font-normal text-sm"
												htmlFor="rememberMe"
											>
												{localization.auth.rememberMe}
											</FieldLabel>
										</div>
									</Field>
								)}

								{Captcha && (
									<div className="flex justify-center">{Captcha}</div>
								)}

								<div className="flex flex-col gap-3">
									<Button
										className="relative overflow-visible"
										disabled={isPending}
										type="submit"
									>
										{signInEmailPending && <Spinner />}

										{localization.auth.signIn}

										<LastUsedBadge floating method="email" />
									</Button>

									{plugins.flatMap((plugin) =>
										(plugin.authButtons ?? []).map((AuthButton, index) => (
											<AuthButton
												key={`${plugin.id}-${index.toString()}`}
												view="signIn"
											/>
										))
									)}
								</div>
							</FieldGroup>
						</form>
					)}

					{socialPosition === "bottom" && (
						<>
							{showSeparator && (
								<FieldSeparator className="flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
									{localization.auth.or}
								</FieldSeparator>
							)}

							{socialProviders && socialProviders.length > 0 && (
								<ProviderButtons socialLayout={socialLayout} view="signIn" />
							)}
						</>
					)}
				</div>

				<div className="mt-4 flex w-full flex-col items-center gap-3">
					{emailAndPassword?.enabled && emailAndPassword?.forgotPassword && (
						<Link
							className="self-center text-sm underline-offset-4 hover:underline"
							href={`${basePaths.auth}/${viewPaths.auth.forgotPassword}`}
						>
							{localization.auth.forgotPasswordLink}
						</Link>
					)}

					{emailAndPassword?.enabled && (
						<FieldDescription className="text-center">
							{localization.auth.needToCreateAnAccount}{" "}
							<Link
								className="underline underline-offset-4"
								href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
							>
								{localization.auth.signUp}
							</Link>
						</FieldDescription>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
