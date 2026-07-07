import { createCallable } from "react-call";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function DeleteProjectDialogContent({
	projectName,
	threadCount,
	call,
}: {
	projectName: string;
	threadCount: number;
	call: { end: (response: boolean) => void };
}) {
	return (
		<AlertDialog
			onOpenChange={(open) => {
				if (!open) call.end(false);
			}}
			open
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete {projectName}?</AlertDialogTitle>
					<AlertDialogDescription>
						This removes the project and its {threadCount} thread
						{threadCount === 1 ? "" : "s"}. This can't be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={() => call.end(false)}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction onClick={() => call.end(true)}>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export const DeleteProjectDialog = createCallable<
	{ projectName: string; threadCount: number },
	boolean
>(DeleteProjectDialogContent);
