import { SignalingProvider } from "@cyrus/providers/signaling/signaling-provider";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ConnectionError } from "@/components/connection-error";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth";
import { dialSignaling } from "@/lib/orpc";

export const Route = createFileRoute("/_workspace")({
	component: WorkspaceLayout,
});

function WorkspaceLayout() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending || !session?.user) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<Spinner />
			</div>
		);
	}

	return (
		<SignalingProvider
			dialSignaling={dialSignaling}
			errorFallback={(props) => <ConnectionError {...props} />}
			pendingFallback={
				<div className="flex min-h-[50vh] items-center justify-center text-muted-foreground text-sm">
					Connecting to workspace…
				</div>
			}
			queryKey={["signaling", session.user.id]}
		>
			<Outlet />
		</SignalingProvider>
	);
}
