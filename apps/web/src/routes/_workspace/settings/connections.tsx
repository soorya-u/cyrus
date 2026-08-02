import { createFileRoute } from "@tanstack/react-router";
import { ActiveSessions } from "@/components/auth/security/active-sessions";

export const Route = createFileRoute("/_workspace/settings/connections")({
	component: SettingsConnectionsPage,
});

function SettingsConnectionsPage() {
	return (
		<>
			<div className="surface-subheader">
				<span className="font-medium text-sm">Settings</span>
			</div>

			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
				<ActiveSessions />
			</div>
		</>
	);
}
