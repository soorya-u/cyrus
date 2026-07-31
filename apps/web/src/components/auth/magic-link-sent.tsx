import { useAuth, useAuthPlugin } from "@better-auth-ui/react";
import { cn } from "cnfast";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { MAGIC_LINK_SENT } from "@/constants/storage-keys";
import { magicLinkPlugin } from "@/lib/auth/plugins/magic-link-plugin";
import { OpenEmailButton } from "./open-email-button";

export type MagicLinkSentProps = {
	className?: string;
};

export function MagicLinkSent({ className }: MagicLinkSentProps) {
	const { basePaths, emailAndPassword, localization, viewPaths, Link } =
		useAuth();
	const { localization: magicLinkLocalization } =
		useAuthPlugin(magicLinkPlugin);

	const [email] = useState(() => sessionStorage.getItem(MAGIC_LINK_SENT) ?? "");

	return (
		<Card
			className={cn(
				"w-full max-w-sm gap-3 bg-transparent py-5 shadow-none backdrop-blur-xs",
				className
			)}
		>
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

					<div className="mt-4 flex w-full flex-col items-center gap-3">
						{emailAndPassword?.enabled && (
							<div className="flex justify-center gap-2 text-sm">
								<Link
									className="text-foreground underline"
									href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
								>
									{localization.auth.signUp}
								</Link>
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
