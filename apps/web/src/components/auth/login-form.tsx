import { authMutationKeys } from "@better-auth-ui/core";
import {
	AuthPrompts,
	type MagicLinkAuthClient,
	useAuth,
	useAuthPlugin,
	useFetchOptions,
	useSignInEmail,
	useSignInMagicLink,
} from "@better-auth-ui/react";
import { useIsMutating } from "@tanstack/react-query";
import { cn } from "cnfast";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	type SyntheticEvent,
	useState,
} from "react";
import { LastUsedBadge } from "@/components/auth/last-login-method/last-used-badge";
import {
	ProviderButtons,
	type SocialLayout,
} from "@/components/auth/provider-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@/components/ui/field";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { Spinner } from "@/components/ui/spinner";
import { AGENTS } from "@/constants/agents";
import { MAGIC_LINK_SENT } from "@/constants/storage-keys";
import { useSignInContinuation } from "@/hooks/auth/use-sign-in-continuation";
import { magicLinkPlugin } from "@/lib/auth/plugins/magic-link-plugin";

export type LoginFormProps = {
	className?: string;
	socialLayout?: SocialLayout;
	socialPosition?: "top" | "bottom";
	callbackUrl?: string;
};

function LoginAgentsPanel() {
	return (
		<div className="relative hidden min-h-100 overflow-hidden border-white/10 border-l bg-black md:block">
			<FlickeringGrid
				className="absolute inset-0 z-0"
				color="rgb(255, 255, 255)"
				maxOpacity={0.12}
			/>
			<div className="absolute inset-0 z-1">
				<OrbitingCircles iconSize={28} radius={105} reverse speed={1.5}>
					{AGENTS.slice()
						.reverse()
						.map((agent) => (
							<img
								alt=""
								aria-hidden="true"
								className={
									agent.invertInLight
										? "size-full object-contain invert dark:invert-0"
										: "size-full object-contain"
								}
								height={28}
								key={agent.key}
								src={agent.src}
								width={28}
							/>
						))}
				</OrbitingCircles>
			</div>
		</div>
	);
}

type PasswordFieldsProps = {
	authButtons: ReactNode;
	captcha: ReactNode;
	emailError?: string;
	isPending: boolean;
	isPasswordVisible: boolean;
	maxPasswordLength?: number;
	minPasswordLength?: number;
	onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
	onTogglePassword: () => void;
	password: string;
	passwordError?: string;
	passwordPlaceholder: string;
	rememberMe?: boolean;
	rememberMeLabel: string;
	setFieldErrors: Dispatch<
		SetStateAction<{ email?: string; password?: string }>
	>;
	setPassword: (value: string) => void;
	signInEmailPending: boolean;
	labels: {
		email: string;
		emailPlaceholder: string;
		fieldRequired: string;
		hidePassword: string;
		invalidEmail: string;
		password: string;
		showPassword: string;
		signIn: string;
		tooLong: string;
		tooShort: string;
	};
};

function PasswordAuthFields({
	authButtons,
	captcha,
	emailError,
	isPending,
	isPasswordVisible,
	labels,
	maxPasswordLength,
	minPasswordLength,
	onSubmit,
	onTogglePassword,
	password,
	passwordError,
	passwordPlaceholder,
	rememberMe,
	rememberMeLabel,
	setFieldErrors,
	setPassword,
	signInEmailPending,
}: PasswordFieldsProps) {
	return (
		<div className="flex flex-col gap-3">
			<form onSubmit={onSubmit}>
				<FieldGroup>
					<Field data-invalid={!!emailError}>
						<FieldLabel htmlFor="email">{labels.email}</FieldLabel>
						<Input
							aria-invalid={!!emailError}
							autoComplete="email"
							className="bg-black/75 dark:bg-black/75"
							disabled={isPending}
							id="email"
							name="email"
							onChange={() => {
								setFieldErrors((prev) => ({ ...prev, email: undefined }));
							}}
							onInvalid={(e) => {
								e.preventDefault();
								const el = e.target as HTMLInputElement;
								const msg = el.validity.valueMissing
									? labels.fieldRequired
									: labels.invalidEmail;
								setFieldErrors((prev) => ({ ...prev, email: msg }));
							}}
							placeholder={labels.emailPlaceholder}
							required
							type="email"
						/>
						<FieldError>{emailError}</FieldError>
					</Field>

					<Field data-invalid={!!passwordError}>
						<FieldLabel htmlFor="password">{labels.password}</FieldLabel>
						<InputGroup className="bg-black/75 dark:bg-black/75">
							<InputGroupInput
								aria-invalid={!!passwordError}
								autoComplete="current-password"
								disabled={isPending}
								id="password"
								maxLength={maxPasswordLength}
								minLength={minPasswordLength}
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
									let msg = labels.fieldRequired;
									if (!el.validity.valueMissing) {
										msg = el.validity.tooShort
											? labels.tooShort.replace(
													"{{min}}",
													String(minPasswordLength)
												)
											: labels.tooLong.replace(
													"{{max}}",
													String(maxPasswordLength)
												);
									}
									setFieldErrors((prev) => ({ ...prev, password: msg }));
								}}
								placeholder={passwordPlaceholder}
								required
								type={isPasswordVisible ? "text" : "password"}
								value={password}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupButton
									aria-label={
										isPasswordVisible
											? labels.hidePassword
											: labels.showPassword
									}
									onClick={onTogglePassword}
									size="icon-xs"
									title={
										isPasswordVisible
											? labels.hidePassword
											: labels.showPassword
									}
								>
									{isPasswordVisible ? <EyeOff /> : <Eye />}
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
						<FieldError>{passwordError}</FieldError>
					</Field>

					{rememberMe && (
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
									{rememberMeLabel}
								</FieldLabel>
							</div>
						</Field>
					)}

					{captcha}

					<Button
						className="relative overflow-visible bg-foreground text-background hover:bg-white hover:text-background"
						disabled={isPending}
						type="submit"
					>
						{signInEmailPending && <Spinner />}
						{labels.signIn}
						<LastUsedBadge floating method="email" />
					</Button>
				</FieldGroup>
			</form>
			{authButtons}
		</div>
	);
}

type MagicLinkFieldsProps = {
	authButtons: ReactNode;
	email: string;
	emailError?: string;
	emailLabel: string;
	emailPlaceholder: string;
	isPending: boolean;
	onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
	setEmail: (value: string) => void;
	setFieldErrors: Dispatch<
		SetStateAction<{ email?: string; password?: string }>
	>;
	signInMagicLinkPending: boolean;
	submitLabel: string;
};

function MagicLinkAuthFields({
	authButtons,
	email,
	emailError,
	emailLabel,
	emailPlaceholder,
	isPending,
	onSubmit,
	setEmail,
	setFieldErrors,
	signInMagicLinkPending,
	submitLabel,
}: MagicLinkFieldsProps) {
	return (
		<form onSubmit={onSubmit}>
			<FieldGroup>
				<Field data-invalid={!!emailError}>
					<FieldLabel htmlFor="email">{emailLabel}</FieldLabel>
					<Input
						aria-invalid={!!emailError}
						autoComplete="email"
						className="bg-black/75 dark:bg-black/75"
						disabled={isPending}
						id="email"
						name="email"
						onChange={(e) => {
							setEmail(e.target.value);
							setFieldErrors((prev) => ({ ...prev, email: undefined }));
						}}
						onInvalid={(e) => {
							e.preventDefault();
							setFieldErrors((prev) => ({
								...prev,
								email: (e.target as HTMLInputElement).validationMessage,
							}));
						}}
						placeholder={emailPlaceholder}
						required
						type="email"
						value={email}
					/>
					<FieldError>{emailError}</FieldError>
				</Field>

				<div className="flex flex-col gap-3">
					<Button
						className="bg-foreground text-background hover:bg-white hover:text-background"
						disabled={isPending}
						type="submit"
					>
						{signInMagicLinkPending ? <Spinner /> : <Mail />}
						{submitLabel}
					</Button>
					{authButtons}
				</div>
			</FieldGroup>
		</form>
	);
}

/**
 * Two-column auth form combining email/password (when enabled) and magic-link
 * flows with social providers, plus an orbiting-agents visual panel.
 */
export function LoginForm({
	className,
	socialLayout,
	socialPosition = "bottom",
	callbackUrl,
}: LoginFormProps) {
	const {
		authClient,
		basePaths,
		baseURL,
		emailAndPassword,
		localization,
		navigate,
		plugins,
		redirectTo,
		socialProviders,
		viewPaths,
	} = useAuth();
	const { localization: magicLinkLocalization, viewPaths: magicLinkViewPaths } =
		useAuthPlugin(magicLinkPlugin);

	const { fetchOptions, resetFetchOptions } = useFetchOptions();
	const continueSignIn = useSignInContinuation();

	const canUseEmailAndPassword = Boolean(emailAndPassword?.enabled);
	const [mode, setMode] = useState<"signIn" | "magicLink">(
		canUseEmailAndPassword ? "signIn" : "magicLink"
	);
	const view = mode;

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<{
		email?: string;
		password?: string;
	}>({});

	const { mutate: signInEmail, isPending: signInEmailPending } = useSignInEmail(
		authClient,
		{
			onError: (error, { email: failedEmail }) => {
				setPassword("");

				if (error.error?.code === "EMAIL_NOT_VERIFIED") {
					sessionStorage.setItem("better-auth-ui.verify-email", failedEmail);
					navigate({
						to: `${basePaths.auth}/${viewPaths.auth.verifyEmail}`,
					});
				}

				resetFetchOptions();
			},
			onSuccess: (data) => continueSignIn(data),
		}
	);

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

	const Captcha = plugins.find(
		(plugin) => plugin.captchaComponent
	)?.captchaComponent;

	const pluginAuthButtons = plugins.flatMap((plugin) =>
		(plugin.authButtons ?? []).map((AuthButton, index) => (
			<AuthButton key={`${plugin.id}-${index.toString()}`} view={view} />
		))
	);

	const authButtons = (
		<>
			{canUseEmailAndPassword && (
				<Button
					className="w-full bg-white/8 hover:border-primary hover:bg-white/12 dark:bg-white/8 dark:hover:bg-white/12"
					disabled={isPending}
					onClick={() => {
						setMode(mode === "signIn" ? "magicLink" : "signIn");
					}}
					type="button"
					variant="outline"
				>
					{mode === "magicLink" ? <Lock /> : <Mail />}
					{localization.auth.continueWith.replace(
						"{{provider}}",
						mode === "magicLink"
							? localization.auth.password
							: magicLinkLocalization.magicLink
					)}
				</Button>
			)}
			{pluginAuthButtons}
		</>
	);

	const showSeparator = Boolean(socialProviders?.length);

	const handlePasswordSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();

		const formData = new FormData(e.currentTarget);
		const submittedEmail = formData.get("email") as string;
		const rememberMe = formData.get("rememberMe") === "on";

		signInEmail({
			email: submittedEmail,
			password,
			...(emailAndPassword?.rememberMe ? { rememberMe } : {}),
			fetchOptions,
		});
	};

	const handleMagicLinkSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		signInMagicLink({
			email,
			callbackURL: callbackUrl ?? `${baseURL}${redirectTo}`,
		});
	};

	const socialBlock = socialProviders && socialProviders.length > 0 && (
		<ProviderButtons
			callbackUrl={callbackUrl}
			socialLayout={socialLayout}
			view={view}
		/>
	);

	const separator = showSeparator && (
		<FieldSeparator
			className={cn(
				"flex items-center text-xs *:data-[slot=field-separator-content]:bg-transparent",
				socialPosition === "top" && "m-0"
			)}
		>
			{localization.auth.or}
		</FieldSeparator>
	);

	const authFields =
		mode === "signIn" ? (
			<PasswordAuthFields
				authButtons={authButtons}
				captcha={
					Captcha ? <div className="flex justify-center">{Captcha}</div> : null
				}
				emailError={fieldErrors.email}
				isPasswordVisible={isPasswordVisible}
				isPending={isPending}
				labels={{
					email: localization.auth.email,
					emailPlaceholder: localization.auth.emailPlaceholder,
					fieldRequired: localization.auth.fieldRequired,
					hidePassword: localization.auth.hidePassword,
					invalidEmail: localization.auth.invalidEmail,
					password: localization.auth.password,
					showPassword: localization.auth.showPassword,
					signIn: localization.auth.signIn,
					tooLong: localization.auth.tooLong,
					tooShort: localization.auth.tooShort,
				}}
				maxPasswordLength={emailAndPassword?.maxPasswordLength}
				minPasswordLength={emailAndPassword?.minPasswordLength}
				onSubmit={handlePasswordSubmit}
				onTogglePassword={() => {
					setIsPasswordVisible((visible) => !visible);
				}}
				password={password}
				passwordError={fieldErrors.password}
				passwordPlaceholder={localization.auth.passwordPlaceholder}
				rememberMe={emailAndPassword?.rememberMe}
				rememberMeLabel={localization.auth.rememberMe}
				setFieldErrors={setFieldErrors}
				setPassword={setPassword}
				signInEmailPending={signInEmailPending}
			/>
		) : (
			<MagicLinkAuthFields
				authButtons={authButtons}
				email={email}
				emailError={fieldErrors.email}
				emailLabel={localization.auth.email}
				emailPlaceholder={localization.auth.emailPlaceholder}
				isPending={isPending}
				onSubmit={handleMagicLinkSubmit}
				setEmail={setEmail}
				setFieldErrors={setFieldErrors}
				signInMagicLinkPending={signInMagicLinkPending}
				submitLabel={localization.auth.continueWith.replace(
					"{{provider}}",
					magicLinkLocalization.magicLink
				)}
			/>
		);

	return (
		<div className={cn("flex w-full flex-col gap-6", className)}>
			<Card className="overflow-hidden border-white/10 bg-black p-0 shadow-none">
				<CardContent className="grid p-0 md:grid-cols-2">
					<div className="bg-black p-6 md:p-8">
						<AuthPrompts view={view} />

						<div className="flex flex-col gap-6">
							<h1 className="text-center font-semibold text-xl">
								{localization.auth.signIn}
							</h1>

							{socialPosition === "top" && (
								<>
									{socialBlock}
									{separator}
								</>
							)}

							{authFields}

							{socialPosition === "bottom" && (
								<>
									{separator}
									{socialBlock}
								</>
							)}
						</div>
					</div>

					<LoginAgentsPanel />
				</CardContent>
			</Card>
		</div>
	);
}
