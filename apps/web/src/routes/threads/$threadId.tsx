import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/threads/$threadId")({
	component: ThreadDetail,
});

function ThreadDetail() {
	const { threadId } = Route.useParams();
	return (
		<div className="p-6">
			<h1 className="text-xl">Thread {threadId}</h1>
			<p className="text-muted-foreground text-sm">
				Feed + composer will live here (seeded from t3code patterns).
			</p>
		</div>
	);
}
