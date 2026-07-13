import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import type { AnyRouter } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

type DevToolsProps = {
	query: QueryClient;
	router: AnyRouter;
};

export function DevTools({ query, router }: DevToolsProps) {
	return (
		<TanStackDevtools
			config={{ position: "bottom-right" }}
			plugins={[
				{
					name: "TanStack Query",
					render: <ReactQueryDevtoolsPanel client={query} />,
				},
				{
					name: "TanStack Router",
					render: <TanStackRouterDevtoolsPanel router={router} />,
				},
			]}
		/>
	);
}
