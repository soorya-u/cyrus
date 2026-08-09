import { cn } from "cnfast";
import { ArrowUpIcon, CornerUpLeftIcon, SquareIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

function QueueOrRunIcon({ shellInputArmed }: { shellInputArmed: boolean }) {
	if (shellInputArmed)
		return <ArrowUpIcon className="size-3.5" strokeWidth={1.8} />;
	return <CornerUpLeftIcon className="size-3.5" strokeWidth={1.8} />;
}

export function ComposerPrimaryAction({
	busy,
	canSend,
	onStop,
	sending = false,
	stopping = false,
	shellInputArmed = false,
}: {
	busy: boolean;
	canSend: boolean;
	onStop?: () => void;
	sending?: boolean;
	stopping?: boolean;
	shellInputArmed?: boolean;
}) {
	if (stopping) {
		return (
			<button
				aria-label="Stopping generation"
				className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/90 text-primary-foreground opacity-30 shadow-none sm:h-8 sm:w-8"
				disabled
				type="button"
			>
				<SquareIcon className="size-3 fill-current" />
			</button>
		);
	}

	if (busy) {
		return (
			<div className="flex items-center gap-1.5">
				{canSend ? (
					<button
						aria-label={shellInputArmed ? "Run command" : "Add to queue"}
						className={cn(
							"flex h-9 w-9 items-center justify-center rounded-full shadow-xs transition-all duration-150 hover:scale-105 active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none enabled:inset-shadow-[0_1px_--theme(--color-white/16%)] enabled:cursor-pointer disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100 sm:h-8 sm:w-8",
							shellInputArmed
								? "bg-terminal/90 text-terminal-foreground shadow-terminal/24 hover:bg-terminal"
								: "bg-primary/90 text-primary-foreground shadow-primary/24 hover:bg-primary"
						)}
						disabled={sending}
						type="submit"
					>
						{sending ? (
							<Spinner className="size-3.5" />
						) : (
							<QueueOrRunIcon shellInputArmed={shellInputArmed} />
						)}
					</button>
				) : null}
				<button
					aria-label="Stop generation"
					className="inset-shadow-[0_1px_--theme(--color-white/16%)] flex size-8 cursor-pointer items-center justify-center rounded-full bg-destructive/90 text-white shadow-destructive/24 shadow-xs transition-all duration-150 hover:scale-105 hover:bg-destructive active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none sm:h-8 sm:w-8"
					onClick={onStop}
					type="button"
				>
					<SquareIcon className="size-3 fill-current" />
				</button>
			</div>
		);
	}

	return (
		<button
			aria-label={sending ? "Sending message" : "Send message"}
			className={cn(
				"flex h-9 w-9 items-center justify-center rounded-full shadow-xs transition-all duration-150 hover:scale-105 active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none enabled:inset-shadow-[0_1px_--theme(--color-white/16%)] enabled:cursor-pointer disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100 sm:h-8 sm:w-8",
				shellInputArmed
					? "bg-terminal/90 text-terminal-foreground shadow-terminal/24 hover:bg-terminal"
					: "bg-primary/90 text-primary-foreground shadow-primary/24 hover:bg-primary"
			)}
			disabled={!canSend || sending}
			type="submit"
		>
			{sending ? (
				<Spinner className="size-3.5" />
			) : (
				<ArrowUpIcon className="size-3.5" strokeWidth={1.8} />
			)}
		</button>
	);
}
