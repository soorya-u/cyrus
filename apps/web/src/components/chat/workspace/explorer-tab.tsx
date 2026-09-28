import { FolderIcon } from "lucide-react";

export function ExplorerTab() {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
			<FolderIcon className="size-5 text-muted-foreground/60" />
			<p className="text-muted-foreground text-xs">
				File browsing coming soon.
			</p>
		</div>
	);
}
