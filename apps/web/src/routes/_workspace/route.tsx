import { createFileRoute, Outlet } from "@tanstack/react-router";
import { dialSignaling } from "@/lib/orpc";

export const Route = createFileRoute("/_workspace")({
	beforeLoad: async () => {
		const { session, orpc } = await dialSignaling();
		return { signaling: session, orpcSignaling: orpc };
	},
	component: WorkspaceLayout,
});

function WorkspaceLayout() {
	return <Outlet />;
}
