import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
	component: AuthCallbackPage,
});

// Optional branded callback page. Only reached when the server plugin is given a
// `webCallbackUrl`; the default flow redirects straight to the desktop loopback
// and never lands here. `forwardToDesktop()` performs the top-level navigation
// to 127.0.0.1 and is a safe no-op in a normal browser.
function AuthCallbackPage() {
	const [done, setDone] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const { success, error } = authClient.forwardToDesktop();
		if (success) {
			setDone(true);
		} else {
			console.error(
				"[auth/callback] forwardToDesktop failed:",
				error?.message,
				{
					hash: window.location.hash,
				}
			);
			setError(error?.message ?? "Unknown error");
		}
	}, []);

	return (
		<p
			style={{
				fontFamily: "sans-serif",
				textAlign: "center",
				marginTop: "20vh",
			}}
		>
			{(done && "You can close this tab.") ||
				(error && `Sign in failed: ${error}`) ||
				"Completing sign in…"}
		</p>
	);
}
