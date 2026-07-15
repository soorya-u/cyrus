import type { ErrorView } from "@cyrus/schemas/view";
import { AlertCircleIcon } from "lucide-react";

export function ErrorRow({ error }: { error: ErrorView }) {
	return (
		<div
			className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3"
			role="alert"
		>
			<div className="flex items-start gap-2.5">
				<AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
				<div className="min-w-0">
					<p className="font-medium text-destructive text-sm">
						{error.message}
					</p>
					<p className="mt-1 text-muted-foreground text-xs">
						Try re-selecting the agent or starting a new message once the issue
						is resolved.
					</p>
				</div>
			</div>
		</div>
	);
}
