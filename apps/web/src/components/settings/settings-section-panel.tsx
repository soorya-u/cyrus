import { cn } from "cnfast";
import type { SettingsSectionId } from "@/constants/settings-nav";
import { SETTINGS_NAV_ITEMS } from "@/constants/settings-nav";

type SettingsSectionPanelProps = {
	section: SettingsSectionId;
};

export function SettingsSectionPanel({ section }: SettingsSectionPanelProps) {
	const active = SETTINGS_NAV_ITEMS.find((item) => item.id === section);

	return (
		<>
			<div
				className={cn(
					"surface-subheader collapsed-sidebar-titlebar-inset px-3 transition-[padding-left] duration-200 ease-linear motion-reduce:transition-none"
				)}
			>
				<span className="font-medium text-sm">Settings</span>
			</div>

			<div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
				<div className="max-w-md space-y-2">
					<h2 className="font-medium text-lg">{active?.label ?? "Settings"}</h2>
					<p className="text-muted-foreground text-sm">
						Settings UI placeholder — wire to real configuration when backend is
						ready.
					</p>
				</div>
			</div>
		</>
	);
}
