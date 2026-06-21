import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	return (
		<div className="p-6">
			<h1 className="text-xl">Dashboard</h1>
			<p>Welcome {session.data?.user.name}</p>
			<p className="mt-4 text-muted-foreground text-sm">
				Threads and workers will appear here.
			</p>
		</div>
	);
}
