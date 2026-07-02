import { AuthProvider } from "@better-auth-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { initLog } from "evlog/client";
import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";
import ReactDOM from "react-dom/client";

import "@fontsource-variable/dm-sans";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

import Loader from "./components/loader";
import { DevTools } from "./devtools";
import { authClient } from "./lib/auth";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./utils/query-client";

initLog({
	service: "cyrus/web",
	console: true,
	pretty: true,
});

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultPendingComponent: () => <Loader />,
	context: { queryClient },
	Wrap({ children }: PropsWithChildren) {
		return (
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				storageKey="ui-theme"
			>
				<QueryClientProvider client={queryClient}>
					<AuthProvider
						authClient={authClient}
						navigate={({ to, replace }) => router.navigate({ to, replace })}
						queryClient={queryClient}
					>
						{children}
					</AuthProvider>
					<DevTools query={queryClient} router={router} />
				</QueryClientProvider>
			</ThemeProvider>
		);
	},
});

declare module "@tanstack/react-router" {
	// biome-ignore lint/style/useConsistentTypeDefinitions: required for module-augmentation merge
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) throw new Error("Root element not found");

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
