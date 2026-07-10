import { Spinner } from "@/components/ui/spinner";

export function AssistantLoading() {
	return (
		<div
			aria-label="Assistant is thinking"
			className="mb-2 flex items-center gap-2 px-0.5 py-1"
			role="status"
		>
			<Spinner className="size-3.5 text-muted-foreground" />
			<span className="text-muted-foreground text-sm">Thinking…</span>
		</div>
	);
}
