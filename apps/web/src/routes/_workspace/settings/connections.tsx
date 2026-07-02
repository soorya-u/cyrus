import { createFileRoute } from "@tanstack/react-router";
import { SettingsSectionPanel } from "@/components/settings/settings-section-panel";

export const Route = createFileRoute("/_workspace/settings/connections")({
	component: SettingsConnectionsPage,
});

function SettingsConnectionsPage() {
	return <SettingsSectionPanel section="connections" />;
}
