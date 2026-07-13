export function ComposerUnavailable() {
	return (
		<div className="group rounded-[22px] p-px transition-colors duration-200">
			<div className="chat-composer-glass rounded-4xl border border-border px-4 py-5 text-center transition-colors duration-200">
				<p className="font-medium text-foreground text-sm">
					No agents available
				</p>
				<p className="mt-1 text-muted-foreground text-xs">
					Enable and configure agents on the worker, then refresh this page.
				</p>
			</div>
		</div>
	);
}
