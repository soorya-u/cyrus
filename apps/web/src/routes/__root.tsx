import { AuthProvider } from "@better-auth-ui/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useAuthErrorToaster } from "@/hooks/use-auth-error-toaster";
import { useDesktopAuthSync } from "@/hooks/use-desktop-auth-sync";
import { authClient } from "@/lib/auth";

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
	const router = useRouter();
	const navigate = useNavigate();
	useAuthErrorToaster();
	useDesktopAuthSync();

	return (
		<>
			<HeadContent />
			<ThemeProvider defaultTheme="dark" storageKey="ui-theme">
				<AuthProvider
					authClient={authClient}
					navigate={({ to, replace }) => navigate({ to, replace })}
				>
					<Outlet />
					<Toaster richColors />
				</AuthProvider>
			</ThemeProvider>
			<TanStackDevtools
				plugins={[
					{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
					{
						name: "TanStack Router",
						render: <TanStackRouterDevtoolsPanel router={router} />,
					},
				]}
			/>
		</>
	);
}
