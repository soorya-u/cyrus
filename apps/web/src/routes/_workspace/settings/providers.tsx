import { createFileRoute } from "@tanstack/react-router";
import { SettingsSectionPanel } from "@/components/settings/settings-section-panel";

export const Route = createFileRoute("/_workspace/settings/providers")({
	component: SettingsProvidersPage,
});

function SettingsProvidersPage() {
	return <SettingsSectionPanel section="providers" />;
}
