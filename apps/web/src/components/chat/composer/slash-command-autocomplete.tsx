import type { AvailableCommand } from "@cyrus/schemas/rtc/catalog";
import { cn } from "cnfast";
import { filterSlashCommands } from "@/utils/filters";

export function SlashCommandAutocomplete({
	commands,
	filter,
	onSelect,
	activeIndex = 0,
}: {
	commands: AvailableCommand[];
	filter: string;
	onSelect: (command: AvailableCommand) => void;
	activeIndex?: number;
}) {
	const matches = filterSlashCommands(commands, filter);

	return (
		<div className="absolute inset-x-0 bottom-full z-20 mb-1 overflow-hidden rounded-xl border border-border bg-popover shadow-md">
			{matches.length === 0 ? (
				<div className="px-3 py-2.5 text-muted-foreground text-xs">
					{commands.length === 0
						? "No slash commands from this agent yet"
						: `No commands matching “/${filter}”`}
				</div>
			) : (
				<ul className="max-h-48 overflow-y-auto py-1">
					{matches.map((command, index) => {
						const isActive = index === activeIndex;
						return (
							<li key={command.name}>
								<button
									className={cn(
										"flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm",
										isActive ? "bg-accent" : "hover:bg-accent"
									)}
									data-active={isActive ? "true" : undefined}
									onMouseDown={(event) => {
										event.preventDefault();
										onSelect(command);
									}}
									type="button"
								>
									<span className="font-medium text-foreground">
										/{command.name}
									</span>
									{command.description ? (
										<span className="text-muted-foreground text-xs">
											{command.description}
										</span>
									) : null}
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
