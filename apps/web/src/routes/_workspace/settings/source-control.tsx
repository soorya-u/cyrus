import { createFileRoute } from "@tanstack/react-router";
import { SettingsSectionPanel } from "@/components/settings/settings-section-panel";

export const Route = createFileRoute("/_workspace/settings/source-control")({
	component: SettingsSourceControlPage,
});

function SettingsSourceControlPage() {
	return <SettingsSectionPanel section="source-control" />;
}
