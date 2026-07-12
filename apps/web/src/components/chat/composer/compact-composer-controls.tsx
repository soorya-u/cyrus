import { useAgentCatalog } from "@cyrus/hooks/connection/use-agent-catalog";
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
	projectId,
	threadId,
}: {
	projectId: string;
	threadId: string;
}) {
	const {
		efforts,
		personas,
		selectedEffort,
		selectedPersona,
		selectEffort,
		selectPersona,
	} = useAgentCatalog({ projectId, threadId });

	if (efforts.length === 0 && personas.length === 0) return null;

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
				{efforts.length > 0 && (
					<>
						<DropdownMenuLabel>Effort</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							onValueChange={selectEffort}
							value={selectedEffort}
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
							value={selectedPersona}
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
