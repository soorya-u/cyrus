import { createFileRoute } from "@tanstack/react-router";
import type { SocialProvider } from "better-auth/social-providers";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuthDesktop } from "@/hooks/auth/use-desktop";

export const Route = createFileRoute("/auth/desktop")({
	validateSearch: (search) => ({
		provider: (search.provider as SocialProvider | undefined) ?? "github",
	}),
	component: DesktopAuthPage,
});

function DesktopAuthPage() {
	const { provider } = Route.useSearch();
	const { trySignIn, copyLink, isCopying } = useAuthDesktop(provider);

	return (
		<>
			<h1 className="font-medium text-2xl tracking-tight">Sign in</h1>
			<p className="max-w-sm text-center text-muted-foreground text-sm leading-relaxed">
				Please authenticate yourself in the browser window that opened. If it
				hasn't,{" "}
				<Button
					className="inline-flex h-7 px-2 align-baseline"
					onClick={trySignIn}
					size="sm"
					type="button"
					variant="outline"
				>
					try again
				</Button>{" "}
				or{" "}
				<Button
					className="inline-flex h-7 gap-1 px-2 align-baseline"
					disabled={isCopying}
					onClick={copyLink}
					size="sm"
					type="button"
					variant="outline"
				>
					{isCopying ? <Spinner className="size-3" /> : null}
					copy link
				</Button>{" "}
				and open it in your browser.
			</p>
		</>
	);
}
