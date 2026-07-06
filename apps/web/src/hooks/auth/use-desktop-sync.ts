import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { desktopAuth } from "@/lib/auth";

export function useDesktopAuthSync() {
	const navigate = useNavigate();
	useEffect(() => {
		if (!desktopAuth) return;

		return desktopAuth.onAuthenticated(() =>
			navigate({ to: "/workers" }).catch(() => undefined)
		);
	}, [navigate]);
}
