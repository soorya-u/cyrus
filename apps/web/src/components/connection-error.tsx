import { ConnectionUpgradeRequiredError } from "@cyrus/errors/connection";
import type { ConnectionErrorRenderProps } from "@cyrus/providers/types";
import { Button } from "@/components/ui/button";

// Placeholder connection error UI — customize per platform as needed.
export function ConnectionError({ error, retry }: ConnectionErrorRenderProps) {
	if (error instanceof ConnectionUpgradeRequiredError)
		return (
			<div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
				<p className="text-foreground text-sm">
					Cyrus has been updated. Reload to continue.
				</p>
				<Button
					onClick={() => window.location.reload()}
					type="button"
					variant="outline"
				>
					Reload
				</Button>
			</div>
		);

	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
			<p className="text-muted-foreground text-sm">Connection failed</p>
			<p className="max-w-md text-foreground text-sm">{error.message}</p>
			<Button onClick={retry} type="button" variant="outline">
				Retry
			</Button>
		</div>
	);
}
