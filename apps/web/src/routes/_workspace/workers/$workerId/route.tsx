import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { dialController } from "@/lib/orpc";
import { useWorkerStore } from "@/stores/worker";

export const Route = createFileRoute("/_workspace/workers/$workerId")({
	beforeLoad: async ({ context, params }) => {
		const { connection, orpc } = await dialController(
			context.signaling,
			params.workerId
		);
		return { workerConnection: connection, orpcController: orpc };
	},
	component: WorkerLayout,
});

function WorkerLayout() {
	const { workerId } = Route.useParams();
	const { workerConnection } = Route.useRouteContext();
	const setLastWorkerId = useWorkerStore((state) => state.setLastWorkerId);

	useEffect(() => () => workerConnection.close(), [workerConnection]);
	useEffect(() => setLastWorkerId(workerId), [workerId, setLastWorkerId]);

	return <Outlet />;
}
