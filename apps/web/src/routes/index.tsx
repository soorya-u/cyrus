import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<div className="p-6">
			<h1 className="font-bold text-2xl">Cyrus</h1>
			<p className="text-muted-foreground">
				Distributed Personal Agent Controller
			</p>
		</div>
	);
}
