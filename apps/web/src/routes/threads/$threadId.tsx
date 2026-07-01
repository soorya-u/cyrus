// biome-ignore lint/style/useFilenamingConvention: TanStack Router requires $threadId param syntax.

import { createFileRoute } from "@tanstack/react-router";
import { WebChatApp } from "@/components/web-chat-app";

export type ThreadRouteParams = {
	workerId: string;
	projectId: string;
	threadId: string;
};

export const Route = createFileRoute("/threads/$threadId")({
	component: () => <ThreadDetail projectId="" threadId="" workerId="" />,
});

/** Thread detail shell — preserves route params for future wiring to live feed. */
export function ThreadDetail({
	workerId,
	projectId,
	threadId,
}: ThreadRouteParams) {
	return (
		<WebChatApp
			initialThreadId={threadId}
			projectId={projectId}
			workerId={workerId}
		/>
	);
}
