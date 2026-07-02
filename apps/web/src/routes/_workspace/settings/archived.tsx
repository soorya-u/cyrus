import { createFileRoute } from "@tanstack/react-router";
import { SettingsSectionPanel } from "@/components/settings/settings-section-panel";

export const Route = createFileRoute("/_workspace/settings/archived")({
	component: SettingsArchivedPage,
});

function SettingsArchivedPage() {
	return <SettingsSectionPanel section="archived" />;
}
