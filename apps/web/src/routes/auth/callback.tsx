import { createFileRoute } from "@tanstack/react-router";
import { useAuthCallback } from "@/hooks/auth/use-callback";

export const Route = createFileRoute("/auth/callback")({
	component: AuthCallbackPage,
});

function AuthCallbackPage() {
	const { done, failed } = useAuthCallback();

	return (
		<p className="text-center text-muted-foreground text-sm">
			{(done && "You can close this tab.") ||
				(failed && "Sign in failed. Please try again from the Cyrus app.") ||
				"Completing sign in…"}
		</p>
	);
}
