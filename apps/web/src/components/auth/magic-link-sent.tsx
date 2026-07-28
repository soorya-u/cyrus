import { useAuth, useAuthPlugin } from "@better-auth-ui/react";
import { cn } from "cnfast";
import { useState } from "react";
import { magicLinkPlugin } from "@/auth/magic-link-plugin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { MAGIC_LINK_SENT_STORAGE_KEY } from "@/constants/storage-keys";
import { OpenEmailButton } from "./open-email-button";

export type MagicLinkSentProps = {
	className?: string;
};

/**
 * Render a card confirming that a magic-link email was sent, with a button
 * to open the user's email provider.
 *
 * The target email is read from `sessionStorage` (set when the magic-link
 * form redirects here); the OpenEmail button is only shown when an email is
 * stored and resolves to a known provider.
 *
 * @param className - Additional CSS classes applied to the card
 * @returns The magic-link-sent card React element
 */
export function MagicLinkSent({ className }: MagicLinkSentProps) {
	const { basePaths, emailAndPassword, localization, viewPaths, Link } =
		useAuth();
	const { localization: magicLinkLocalization } =
		useAuthPlugin(magicLinkPlugin);

	const [email] = useState(
		() => sessionStorage.getItem(MAGIC_LINK_SENT_STORAGE_KEY) ?? ""
	);

	return (
		<Card className={cn("w-full max-w-sm", className)}>
			<CardHeader>
				<CardTitle className="font-semibold text-xl">
					{localization.auth.checkYourEmailTitle}
				</CardTitle>
			</CardHeader>

			<CardContent>
				<div className="flex flex-col gap-4">
					<FieldDescription>
						{email
							? magicLinkLocalization.magicLinkSentTo.replace(
									"{{email}}",
									email
								)
							: magicLinkLocalization.magicLinkSent}
					</FieldDescription>

					{email && <OpenEmailButton email={email} />}
				</div>

				{emailAndPassword?.enabled && (
					<div className="mt-4 flex w-full flex-col items-center gap-3">
						<FieldDescription className="text-center">
							{localization.auth.needToCreateAnAccount}{" "}
							<Link
								className="underline underline-offset-4"
								href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
							>
								{localization.auth.signUp}
							</Link>
						</FieldDescription>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
