import type { ReactNode } from "react";
import {
	Sheet,
	SheetDescription,
	SheetHeader,
	SheetPopup,
	SheetTitle,
} from "@/components/ui/sheet";

export function WorkspaceDrawerSheet({
	open,
	onOpenChange,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
}) {
	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetPopup
				className="col-start-1 w-full max-w-none border-0 p-0"
				showCloseButton={false}
				side="right"
			>
				<SheetHeader className="sr-only">
					<SheetTitle>Workspace</SheetTitle>
					<SheetDescription>
						File explorer and diff for this thread.
					</SheetDescription>
				</SheetHeader>
				<div className="flex h-full min-h-0 w-full flex-col pt-safe pb-safe">
					{children}
				</div>
			</SheetPopup>
		</Sheet>
	);
}
