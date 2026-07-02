"use client";

import { BotIcon, ChevronDownIcon, LockIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";

function ClaudeIcon({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={cn("fill-[#d97757]", className)}
			preserveAspectRatio="xMidYMid"
			viewBox="0 0 256 257"
		>
			<path d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z" />
		</svg>
	);
}

function SendArrowIcon() {
	return (
		<svg
			aria-hidden="true"
			fill="none"
			height="14"
			viewBox="0 0 14 14"
			width="14"
		>
			<path
				d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.8"
			/>
		</svg>
	);
}

function StopSquareIcon() {
	return (
		<svg
			aria-hidden="true"
			fill="currentColor"
			height="12"
			viewBox="0 0 12 12"
			width="12"
		>
			<rect height="8" rx="1.5" width="8" x="2" y="2" />
		</svg>
	);
}

function ComposerFooterControls() {
	const modelLabel = "claude-sonnet-4";
	const interactionModeTooltip = "Default mode — click to enter plan mode";
	const runtimeModeTooltip = "Ask before commands and file changes.";

	return (
		<div className="scrollbar-none -m-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1 [&::-webkit-scrollbar]:hidden">
			<Button
				className="min-w-0 max-w-48 shrink justify-between whitespace-nowrap px-2 text-muted-foreground/70 hover:text-foreground/80 sm:max-w-56 sm:px-3"
				data-chat-provider-model-picker="true"
				size="sm"
				type="button"
				variant="ghost"
			>
				<span className="flex min-w-0 flex-1 items-center gap-2">
					<ClaudeIcon className="size-4 shrink-0" />
					<Tooltip>
						<TooltipTrigger
							render={
								<span className="min-w-0 flex-1 overflow-hidden truncate" />
							}
						>
							{modelLabel}
						</TooltipTrigger>
						<TooltipPopup side="top">{modelLabel}</TooltipPopup>
					</Tooltip>
				</span>
				<span aria-hidden="true" className="flex items-center">
					<ChevronDownIcon className="ms-0! -me-1! size-3 shrink-0 opacity-60" />
				</span>
			</Button>

			<Separator
				className="mx-0.5 hidden h-4 sm:block"
				orientation="vertical"
			/>

			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							aria-label="Runtime mode"
							className="shrink-0 whitespace-nowrap px-2 font-medium text-muted-foreground/70 hover:text-foreground/80 sm:px-3"
							size="sm"
							type="button"
							variant="ghost"
						/>
					}
				>
					<LockIcon className="size-4" />
					<span className="truncate">Supervised</span>
					<ChevronDownIcon className="-me-1 size-3 opacity-50" />
				</TooltipTrigger>
				<TooltipPopup side="top">{runtimeModeTooltip}</TooltipPopup>
			</Tooltip>

			<Separator
				className="mx-0.5 hidden h-4 sm:block"
				orientation="vertical"
			/>

			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							aria-label={interactionModeTooltip}
							className="shrink-0 whitespace-nowrap px-2 text-muted-foreground/70 hover:text-foreground/80 sm:px-3"
							size="sm"
							type="button"
							variant="ghost"
						/>
					}
				>
					<BotIcon />
					<span className="sr-only sm:not-sr-only">Build</span>
				</TooltipTrigger>
				<TooltipPopup side="top">{interactionModeTooltip}</TooltipPopup>
			</Tooltip>
		</div>
	);
}

function ComposerPrimaryAction({
	busy,
	canSend,
	onStop,
}: {
	busy: boolean;
	canSend: boolean;
	onStop?: () => void;
}) {
	if (busy) {
		return (
			<button
				aria-label="Stop generation"
				className="inset-shadow-[0_1px_--theme(--color-white/16%)] flex size-8 cursor-pointer items-center justify-center rounded-full bg-destructive/90 text-white shadow-destructive/24 shadow-xs transition-all duration-150 hover:scale-105 hover:bg-destructive active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none sm:h-8 sm:w-8"
				onClick={onStop}
				type="button"
			>
				<StopSquareIcon />
			</button>
		);
	}

	return (
		<button
			aria-label="Send message"
			className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-xs transition-all duration-150 hover:scale-105 hover:bg-primary active:inset-shadow-[0_1px_--theme(--color-black/8%)] active:shadow-none enabled:inset-shadow-[0_1px_--theme(--color-white/16%)] enabled:cursor-pointer enabled:shadow-primary/24 disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100 sm:h-8 sm:w-8"
			disabled={!canSend}
			type="submit"
		>
			<SendArrowIcon />
		</button>
	);
}

export function Composer({
	onSend,
	onStop,
	busy = false,
}: {
	onSend: (text: string) => void;
	onStop?: () => void;
	busy?: boolean;
}) {
	const [value, setValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) {
			return;
		}
		if (value.length >= 0) {
			textarea.style.height = "auto";
			textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
		}
	}, [value]);

	function submit() {
		const text = value.trim();
		if (!text || busy) {
			return;
		}
		onSend(text);
		setValue("");
	}

	return (
		<div
			className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pt-1.5 sm:pt-2"
			data-chat-composer-overlay="true"
		>
			<div
				aria-hidden="true"
				className="chat-composer-horizontal-inset pointer-events-none absolute inset-x-0 top-1.5 bottom-0 z-0 sm:top-2"
			>
				<div className="relative mx-auto h-full w-full max-w-3xl overflow-clip rounded-t-4xl">
					<div className="chat-composer-shared-blur absolute -inset-8" />
				</div>
			</div>

			<div className="chat-composer-horizontal-inset">
				<div className="pointer-events-auto relative isolate z-10">
					<form
						className="mx-auto w-full min-w-0 max-w-3xl"
						data-chat-composer-form="true"
						onSubmit={(event) => {
							event.preventDefault();
							submit();
						}}
					>
						<div className="group rounded-[22px] p-px transition-colors duration-200">
							<div className="chat-composer-glass rounded-4xl border border-border transition-colors duration-200 has-focus-visible:border-ring/45">
								<div className="relative px-3 pt-3.5 pb-2 sm:px-4 sm:pt-4">
									<div className="relative">
										<textarea
											className="block max-h-50 min-h-17.5 w-full resize-none overflow-y-auto whitespace-pre-wrap bg-transparent text-[16px] text-foreground leading-relaxed outline-none placeholder:text-muted-foreground/35 sm:text-[14px]"
											onChange={(event) => setValue(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === "Enter" && !event.shiftKey) {
													event.preventDefault();
													submit();
												}
											}}
											placeholder="Ask anything, @tag files/folders, $use skills, or / for commands"
											ref={textareaRef}
											rows={1}
											value={value}
										/>
									</div>
								</div>

								<div
									className="flex min-w-0 flex-nowrap items-center justify-between gap-2 overflow-visible px-2.5 pb-2.5 sm:gap-0 sm:px-3 sm:pb-3"
									data-chat-composer-footer="true"
								>
									<ComposerFooterControls />
									<div
										className="flex shrink-0 flex-nowrap items-center justify-end gap-2"
										data-chat-composer-actions="right"
									>
										<ComposerPrimaryAction
											busy={busy}
											canSend={value.trim().length > 0}
											onStop={onStop}
										/>
									</div>
								</div>
							</div>
						</div>
					</form>
				</div>
			</div>

			<div className="chat-composer-horizontal-inset chat-composer-lower-chrome relative z-10 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+1rem)]" />
		</div>
	);
}
