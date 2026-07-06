import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/success")({
	component: DesktopSuccessPage,
});

const DEEPLINK = "dev.soorya-u.cyrus://";

function DesktopSuccessPage() {
	const [showFallback, setShowFallback] = useState(false);

	useEffect(() => {
		window.location.href = DEEPLINK;
		const t = setTimeout(() => setShowFallback(true), 2000);
		return () => clearTimeout(t);
	}, []);

	return (
		<>
			<h1 className="font-medium text-2xl tracking-tight">Signed in</h1>
			<p className="text-muted-foreground text-sm">Cyrus is ready to use.</p>
			<Button asChild>
				<a href={DEEPLINK}>Open Cyrus</a>
			</Button>
			{showFallback && (
				<p className="text-muted-foreground text-xs">
					App didn't open? Switch back to the Cyrus window.
				</p>
			)}
		</>
	);
}
