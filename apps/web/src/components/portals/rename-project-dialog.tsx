import { useState } from "react";
import { createCallable } from "react-call";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function RenameProjectDialogContent({
	currentName,
	call,
}: {
	currentName: string;
	call: { end: (response: string | null) => void };
}) {
	const [renameValue, setRenameValue] = useState(currentName);

	const submitRename = () => {
		const trimmed = renameValue.trim();
		if (trimmed) call.end(trimmed);
	};

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) call.end(null);
			}}
			open
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Rename project</DialogTitle>
				</DialogHeader>
				<Input
					aria-label="Project name"
					autoFocus
					onChange={(event) => setRenameValue(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							submitRename();
						}
					}}
					value={renameValue}
				/>
				<DialogFooter>
					<Button onClick={() => call.end(null)} variant="outline">
						Cancel
					</Button>
					<Button disabled={!renameValue.trim()} onClick={submitRename}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export const RenameProjectDialog = createCallable<
	{ currentName: string },
	string | null
>(RenameProjectDialogContent);
