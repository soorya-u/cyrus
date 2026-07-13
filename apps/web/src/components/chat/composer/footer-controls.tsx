import { useAgentCatalog } from "@cyrus/hooks/connection/use-agent-catalog";
import type { RegisteredAgent } from "@cyrus/schemas/rtc/agents";
import { AgentModelPicker } from "@/components/chat/composer/agent-model-picker";
import { CompactComposerControls } from "@/components/chat/composer/compact-composer-controls";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-media-query";

const TRIGGER_CLASS =
	"h-8 min-w-0 max-w-40 shrink justify-between gap-1.5 whitespace-nowrap border-none bg-transparent px-2 text-muted-foreground/70 shadow-none hover:bg-accent hover:text-foreground/80 dark:bg-transparent dark:hover:bg-accent sm:max-w-48 sm:px-3";

function CatalogSelect({
	label,
	value,
	onValueChange,
	options,
}: {
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	options: Array<{ id: string; name: string }>;
}) {
	if (options.length === 0) return null;

	return (
		<Select onValueChange={onValueChange} value={value}>
			<SelectTrigger className={TRIGGER_CLASS} size="sm">
				<SelectValue placeholder={label} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.id} value={option.id}>
						{option.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function ComposerFooterControls({
	agents,
	projectId,
	threadId,
}: {
	agents: RegisteredAgent[];
	projectId: string;
	threadId: string;
}) {
	const isCompact = useIsMobile();
	const {
		displayEffort,
		displayPersona,
		efforts,
		personas,
		selectEffort,
		selectPersona,
	} = useAgentCatalog({ agents, projectId, threadId });

	return (
		<div className="scrollbar-none -m-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1 [&::-webkit-scrollbar]:hidden">
			<AgentModelPicker
				agents={agents}
				projectId={projectId}
				threadId={threadId}
			/>

			{isCompact ? (
				<CompactComposerControls
					agents={agents}
					projectId={projectId}
					threadId={threadId}
				/>
			) : (
				<>
					{efforts.length > 0 && (
						<>
							<Separator
								className="mx-0.5 hidden h-4 sm:block"
								orientation="vertical"
							/>
							<CatalogSelect
								label="Effort"
								onValueChange={selectEffort}
								options={efforts}
								value={displayEffort}
							/>
						</>
					)}
					{personas.length > 0 && (
						<>
							<Separator
								className="mx-0.5 hidden h-4 sm:block"
								orientation="vertical"
							/>
							<CatalogSelect
								label="Persona"
								onValueChange={selectPersona}
								options={personas}
								value={displayPersona}
							/>
						</>
					)}
				</>
			)}
		</div>
	);
}
