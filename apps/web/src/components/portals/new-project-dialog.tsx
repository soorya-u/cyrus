import { cn } from "cnfast";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CornerLeftUpIcon,
	FolderIcon,
	FolderPlusIcon,
} from "lucide-react";
import { createCallable } from "react-call";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandCollection,
	CommandDialog,
	CommandDialogPopup,
	CommandFooter,
	CommandGroup,
	CommandGroupLabel,
	CommandInput,
	CommandItem,
	CommandList,
	CommandPanel,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { useAddProjectBrowse } from "@/hooks/projects/use-add-project-browse";
import { buildBrowseGroups } from "@/utils/dir";

const ITEM_ICON_CLASS = "size-4 text-muted-foreground/80";

function NewProjectDialogContent({
	call,
}: {
	call: {
		end: (response: { name: string; path: string } | null) => void;
		ended: boolean;
	};
}) {
	const {
		query,
		setQuery,
		highlightedItemValue,
		setHighlightedItemValue,
		browseGeneration,
		reset,
		browseUp,
		browseTo,
		canBrowseUp,
		filteredBrowseEntries,
		hasHighlightedBrowseItem,
		willCreateProjectPath,
		submitActionLabel,
		addShortcutLabel,
		submitModifierLabel,
		handleKeyDown,
		submitAddProject,
		resolvedAddProjectPath,
		emptyStateMessage,
	} = useAddProjectBrowse({
		open: true,
		onCreate: (name, path) => {
			call.end({ name, path });
		},
		onOpenChange: (nextOpen) => {
			if (!(nextOpen || call.ended)) {
				reset();
				call.end(null);
			}
		},
	});

	const browseGroups = buildBrowseGroups({
		browseEntries: filteredBrowseEntries,
		canBrowseUp,
		upIcon: <CornerLeftUpIcon className={ITEM_ICON_CLASS} />,
		directoryIcon: <FolderIcon className={ITEM_ICON_CLASS} />,
		browseUp,
		browseTo,
	});

	return (
		<CommandDialog
			onOpenChange={(nextOpen) => {
				if (!nextOpen) reset();
				if (!(nextOpen || call.ended)) call.end(null);
			}}
			open
		>
			<CommandDialogPopup
				aria-label="Add project"
				className="overflow-hidden p-0"
				data-testid="add-project-dialog"
				onBackdropPointerDown={() => {
					if (!call.ended) call.end(null);
				}}
			>
				<Command
					autoHighlight={false}
					key={`add-project-${browseGeneration}`}
					mode="none"
					onItemHighlighted={(value) => {
						setHighlightedItemValue(typeof value === "string" ? value : null);
					}}
					onValueChange={(nextQuery) => {
						setHighlightedItemValue(null);
						setQuery(nextQuery);
					}}
					value={query}
				>
					<div className="relative">
						<CommandInput
							className={willCreateProjectPath ? "pe-36" : "pe-16"}
							onKeyDown={handleKeyDown}
							placeholder="Enter project path (e.g. ~/projects/my-app)"
							startAddon={<FolderPlusIcon />}
						/>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										aria-label={`${submitActionLabel} (${addShortcutLabel})`}
										className={cn(
											"absolute inset-e-2.5 top-1/2 -translate-y-1/2 ps-2 pe-1",
											hasHighlightedBrowseItem ? "gap-1" : "gap-1.5"
										)}
										onClick={() => {
											submitAddProject(resolvedAddProjectPath);
										}}
										onMouseDown={(event) => {
											event.preventDefault();
										}}
										size="xs"
										tabIndex={-1}
										type="button"
										variant="outline"
									/>
								}
							>
								<span>{submitActionLabel}</span>
								<KbdGroup className="pointer-events-none -me-0.5 items-center gap-1">
									<Kbd>
										{hasHighlightedBrowseItem
											? `${submitModifierLabel} Enter`
											: "Enter"}
									</Kbd>
								</KbdGroup>
							</TooltipTrigger>
							<TooltipPopup side="top">
								{submitActionLabel} ({addShortcutLabel})
							</TooltipPopup>
						</Tooltip>
					</div>

					<CommandPanel className="max-h-[min(28rem,70vh)]">
						{browseGroups.length === 0 ? (
							<div className="py-10 text-center text-muted-foreground text-sm">
								{emptyStateMessage}
							</div>
						) : (
							<CommandList>
								{browseGroups.map((group) => (
									<CommandGroup items={group.items} key={group.value}>
										<CommandGroupLabel>{group.label}</CommandGroupLabel>
										<CommandCollection>
											{(item) => (
												<CommandItem
													className={cn(
														"cursor-pointer gap-2 hover:bg-transparent hover:text-inherit data-highlighted:bg-transparent data-selected:bg-transparent data-highlighted:text-inherit data-selected:text-inherit [&[data-highlighted][data-selected]]:bg-transparent [&[data-highlighted][data-selected]]:text-inherit",
														highlightedItemValue === item.value &&
															"bg-accent! text-accent-foreground!"
													)}
													key={item.value}
													onClick={() => {
														item.run();
													}}
													onMouseDown={(event) => {
														event.preventDefault();
													}}
													value={item.value}
												>
													{item.icon}
													<span className="truncate text-foreground text-sm">
														{item.title}
													</span>
												</CommandItem>
											)}
										</CommandCollection>
									</CommandGroup>
								))}
							</CommandList>
						)}
					</CommandPanel>

					<CommandFooter>
						<div className="flex items-center gap-3">
							<KbdGroup className="items-center gap-1.5">
								<Kbd>
									<ArrowUpIcon className="size-3" />
								</Kbd>
								<Kbd>
									<ArrowDownIcon className="size-3" />
								</Kbd>
								<span className="text-muted-foreground/80">Navigate</span>
							</KbdGroup>
							{hasHighlightedBrowseItem ? (
								<KbdGroup className="items-center gap-1.5">
									<Kbd>Enter</Kbd>
									<span className="text-muted-foreground/80">Select</span>
								</KbdGroup>
							) : null}
							<KbdGroup className="items-center gap-1.5">
								<Kbd>Esc</Kbd>
								<span className="text-muted-foreground/80">Close</span>
							</KbdGroup>
						</div>
					</CommandFooter>
				</Command>
			</CommandDialogPopup>
		</CommandDialog>
	);
}

export const NewProjectDialog = createCallable<
	void,
	{ name: string; path: string } | null
>(NewProjectDialogContent);
