import type { ShellExecutionView } from "@cyrus/schemas/view";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useShellFailureToast(execution: ShellExecutionView) {
	const previousStatusRef = useRef(execution.status);

	useEffect(() => {
		const previousStatus = previousStatusRef.current;
		previousStatusRef.current = execution.status;
		if (previousStatus === execution.status) return;

		if (execution.status === "timeout") {
			toast.error(`Command timed out: ${execution.command}`);
		} else if (execution.status === "spawn_error") {
			toast.error(`Failed to start command: ${execution.command}`);
		}
	}, [execution.status, execution.command]);
}
