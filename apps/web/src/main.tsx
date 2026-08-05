import { AuthProvider } from "@better-auth-ui/react";
import { QueryProvider } from "@cyrus/providers/query-provider";
import { useQueryClient } from "@tanstack/react-query";
import {
	type AnyRouter,
	createRouter,
	Link,
	RouterProvider,
} from "@tanstack/react-router";
import { initLog } from "evlog/client";
import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";
import ReactDOM from "react-dom/client";
import { toast } from "sonner";

import "@fontsource-variable/dm-sans";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

import { authClient } from "@/lib/auth";
import { magicLinkPlugin } from "@/lib/auth/plugins/magic-link-plugin";
import { env } from "@/lib/env";
import { DevTools } from "./devtools";
import { routeTree } from "./routeTree.gen";

initLog({
	service: "cyrus/web",
	console: true,
	pretty: true,
});

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultViewTransition: true,
	Wrap({ children }: PropsWithChildren) {
		return (
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				storageKey="ui-theme"
			>
				<QueryProvider
					onError={(error, query) => {
						toast.error(`Error: ${error.message}`, {
							action: {
								label: "retry",
								onClick: () => query.invalidate(),
							},
						});
					}}
				>
					<WebQueryShell router={router}>{children}</WebQueryShell>
				</QueryProvider>
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

function WebQueryShell({
	router,
	children,
}: PropsWithChildren<{ router: AnyRouter }>) {
	const queryClient = useQueryClient();

	return (
		<>
			<AuthProvider
				authClient={authClient}
				emailAndPassword={{ enabled: env.VITE_IS_DEV_MODE }}
				Link={({ href, ...rest }) => <Link {...rest} to={href} />}
				multipleAccountsPerProvider={false}
				navigate={({ to, replace }) => router.navigate({ to, replace })}
				plugins={[magicLinkPlugin()]}
				queryClient={queryClient}
				redirectTo="/workers"
				socialProviders={["github", "google"]}
				viewPaths={{ auth: { signIn: "" } }}
			>
				{children}
			</AuthProvider>
			<DevTools query={queryClient} router={router} />
		</>
	);
}

const rootElement = document.getElementById("app");

if (!rootElement) throw new Error("Root element not found");

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
