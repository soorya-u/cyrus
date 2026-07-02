import { createFileRoute } from "@tanstack/react-router";
import { SettingsSectionPanel } from "@/components/settings/settings-section-panel";

export const Route = createFileRoute("/_workspace/settings/keybindings")({
	component: SettingsKeybindingsPage,
});

function SettingsKeybindingsPage() {
	return <SettingsSectionPanel section="keybindings" />;
}
