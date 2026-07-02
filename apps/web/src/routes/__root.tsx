import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useAuthErrorToaster } from "@/hooks/use-auth-error-toaster";
import { useDesktopAuthSync } from "@/hooks/use-desktop-auth-sync";

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
	useAuthErrorToaster();
	useDesktopAuthSync();

	return (
		<>
			<HeadContent />
			<Outlet />
			<Toaster richColors />
		</>
	);
}
