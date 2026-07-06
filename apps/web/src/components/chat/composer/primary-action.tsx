import { ArrowUpIcon, SquareIcon } from "lucide-react";

export function ComposerPrimaryAction({
	busy,
	canSend,
	onStop,
}: {
	busy: boolean;
	canSend: boolean;
	onStop?: () => void;
}) {
	if (busy)
		return (
			<button
				aria-label="Stop generation"
				className="inset-shadow-[0_1px_--theme(--color-white/16%)] flex size-8 cursor-pointer items-center justify-center rounded-full bg-destructive/90 text-white shadow-destructive/24 shadow-xs transition-all duration-150 hover:scale-105 hover:bg-destructive active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none sm:h-8 sm:w-8"
				onClick={onStop}
				type="button"
			>
				<SquareIcon className="size-3 fill-current" />
			</button>
		);

	return (
		<button
			aria-label="Send message"
			className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-xs transition-all duration-150 hover:scale-105 hover:bg-primary active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none enabled:inset-shadow-[0_1px_--theme(--color-white/16%)] enabled:cursor-pointer enabled:shadow-primary/24 disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100 sm:h-8 sm:w-8"
			disabled={!canSend}
			type="submit"
		>
			<ArrowUpIcon className="size-3.5" strokeWidth={1.8} />
		</button>
	);
}
