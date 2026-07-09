import { SignalingProvider } from "@cyrus/providers/signaling/signaling-provider";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ConnectionError } from "@/components/connection-error";
import { authClient } from "@/lib/auth";
import { dialSignaling } from "@/lib/orpc";

export const Route = createFileRoute("/_workspace")({
	component: WorkspaceLayout,
});

function WorkspaceLayout() {
	const { data: session } = authClient.useSession();
	const userId = session?.user.id ?? "pending";

	return (
		<SignalingProvider
			dialSignaling={dialSignaling}
			errorFallback={(props) => <ConnectionError {...props} />}
			pendingFallback={
				<div className="flex min-h-[50vh] items-center justify-center text-muted-foreground text-sm">
					Connecting to workspace…
				</div>
			}
			queryKey={["signaling", userId]}
		>
			<Outlet />
		</SignalingProvider>
	);
}
