import { useAgentCatalog } from "@cyrus/hooks/agent-catalog/use-agent-catalog";
import type { RegisteredAgent } from "@cyrus/schemas/rtc/agents";
import { EllipsisIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CompactComposerControls({
	agents,
	projectId,
	threadId,
}: {
	agents: RegisteredAgent[];
	projectId: string;
	threadId: string;
}) {
	const {
		displayEffort,
		displayMode,
		displayPersona,
		efforts,
		modes,
		personas,
		selectEffort,
		selectMode,
		selectPersona,
	} = useAgentCatalog({ agents, projectId, threadId });

	if (modes.length === 0 && efforts.length === 0 && personas.length === 0)
		return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label="More composer controls"
					className="shrink-0 px-2 text-muted-foreground/70 hover:text-foreground/80"
					size="sm"
					type="button"
					variant="ghost"
				>
					<EllipsisIcon className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-48">
				{modes.length > 0 && (
					<>
						<DropdownMenuLabel>Mode</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							onValueChange={selectMode}
							value={displayMode}
						>
							{modes.map((mode) => (
								<DropdownMenuRadioItem key={mode.id} value={mode.id}>
									{mode.name}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</>
				)}
				{modes.length > 0 && efforts.length > 0 && <DropdownMenuSeparator />}
				{efforts.length > 0 && (
					<>
						<DropdownMenuLabel>Effort</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							onValueChange={selectEffort}
							value={displayEffort}
						>
							{efforts.map((effort) => (
								<DropdownMenuRadioItem key={effort.id} value={effort.id}>
									{effort.name}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</>
				)}
				{efforts.length > 0 && personas.length > 0 && <DropdownMenuSeparator />}
				{personas.length > 0 && (
					<>
						<DropdownMenuLabel>Persona</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							onValueChange={selectPersona}
							value={displayPersona}
						>
							{personas.map((persona) => (
								<DropdownMenuRadioItem key={persona.id} value={persona.id}>
									{persona.name}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
