import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useDesktopAuthSync } from "@/hooks/auth/use-desktop-sync";
import { useAuthErrorListener } from "@/hooks/auth/use-error-listener";

import "../index.css";

export type RouterAppContext = {
	queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{ title: "Cyrus" },
			{ name: "description", content: "cyrus - distributed agent controller" },
		],
		links: [{ rel: "icon", href: "/favicon.ico" }],
	}),
});

function RootComponent() {
	useAuthErrorListener();
	useDesktopAuthSync();

	return (
		<>
			<HeadContent />
			<Outlet />
			<Toaster richColors />
		</>
	);
}
