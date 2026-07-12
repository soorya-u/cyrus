import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_workspace/workers/$workerId/p/")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/workers/$workerId",
			params: { workerId: params.workerId },
		});
	},
});
