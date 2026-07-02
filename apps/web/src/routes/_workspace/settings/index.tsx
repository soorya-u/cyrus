import { createFileRoute } from "@tanstack/react-router";
import { SettingsSectionPanel } from "@/components/settings/settings-section-panel";

export const Route = createFileRoute("/_workspace/settings/")({
	component: SettingsGeneralPage,
});

function SettingsGeneralPage() {
	return <SettingsSectionPanel section="general" />;
}
