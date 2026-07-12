import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_workspace/workers/$workerId/p/$projectId/t/"
)({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/workers/$workerId/p/$projectId",
			params: {
				workerId: params.workerId,
				projectId: params.projectId,
			},
		});
	},
});
