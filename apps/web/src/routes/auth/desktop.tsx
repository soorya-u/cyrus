import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/auth/desktop")({
	validateSearch: (search) => ({
		provider: (search.provider as string | undefined) ?? "github",
	}),
	component: DesktopAuthPage,
});

function DesktopAuthPage() {
	const { provider } = Route.useSearch();
	const [copied, setCopied] = useState(false);

	const trySignIn = () => {
		authClient.signIn.social({ provider } as Parameters<
			typeof authClient.signIn.social
		>[0]);
	};

	const copyLink = async () => {
		const result = await authClient.signIn.social({
			provider,
			disableRedirect: true,
		} as Parameters<typeof authClient.signIn.social>[0]);
		const url = result?.data?.url;
		if (!url) {
			return;
		}
		await navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<AuthPageLayout>
			<h1 className="font-medium text-2xl tracking-tight">Sign in</h1>
			<p className="max-w-xs text-center text-muted-foreground text-sm">
				A browser window should have opened. If it didn't:
			</p>
			<div className="flex flex-col items-center gap-3">
				<Button onClick={trySignIn} variant="link">
					Try again
				</Button>
				<Button onClick={copyLink} size="sm" variant="outline">
					{copied ? "Copied!" : "Copy link"}
				</Button>
			</div>
		</AuthPageLayout>
	);
}
