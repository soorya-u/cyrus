import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/auth/callback")({
	component: AuthCallbackPage,
});

function AuthCallbackPage() {
	const [done, setDone] = useState(false);

	useEffect(() => {
		const hash = window.location.hash;
		if (!hash.startsWith("#token=")) {
			return;
		}
		const token = hash.slice("#token=".length);
		window.location.replace(
			`dev.soorya-u.cyrus://auth/callback#token=${token}`
		);
		setDone(true);
	}, []);

	return (
		<p
			style={{
				fontFamily: "sans-serif",
				textAlign: "center",
				marginTop: "20vh",
			}}
		>
			{done ? "You can close this tab." : "Completing sign in…"}
		</p>
	);
}
