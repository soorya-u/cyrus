import { useAgentCatalog } from "@cyrus/hooks/agent-catalog/use-agent-catalog";
import type { RegisteredAgent } from "@cyrus/schemas/rtc/agents";
import { useMediaQuery } from "@mantine/hooks";
import { AgentModelPicker } from "@/components/chat/composer/agent-model-picker";
import { CompactComposerControls } from "@/components/chat/composer/compact-composer-controls";
import { ComposerContextUsage } from "@/components/chat/composer/composer-context-usage";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const TRIGGER_CLASS =
	"h-8 min-w-0 max-w-40 shrink justify-between gap-1.5 whitespace-nowrap border-none bg-transparent px-2 text-muted-foreground/70 shadow-none hover:bg-accent hover:text-foreground/80 dark:bg-transparent dark:hover:bg-accent sm:max-w-48 sm:px-3";

export function ComposerFooterColumn({
	catalogError,
	displayAgent,
	onRetryAgent,
	agents,
	localDraft,
	projectId,
	threadId,
}: {
	catalogError: Error | null;
	displayAgent: string;
	onRetryAgent: (agentName: string) => void;
	agents: RegisteredAgent[];
	localDraft: boolean;
	projectId: string;
	threadId: string;
}) {
	const retry =
		catalogError && displayAgent ? () => onRetryAgent(displayAgent) : undefined;

	return (
		<div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
			{catalogError ? (
				<div className="flex min-w-0 items-center gap-2 px-1">
					<p className="min-w-0 truncate text-destructive text-xs">
						{catalogError.message || "Could not load agent catalog."} Select the
						agent again to retry.
					</p>
					{retry ? (
						<Button
							className="h-6 shrink-0 px-2 text-xs"
							onClick={retry}
							size="sm"
							type="button"
							variant="ghost"
						>
							Retry
						</Button>
					) : null}
				</div>
			) : null}
			<ComposerFooterControls
				agents={agents}
				localDraft={localDraft}
				projectId={projectId}
				threadId={threadId}
			/>
		</div>
	);
}

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
	localDraft = false,
}: {
	agents: RegisteredAgent[];
	projectId: string;
	threadId: string;
	localDraft?: boolean;
}) {
	const isCompact = useMediaQuery("(max-width: 768px)", false);
	const {
		contextUsage,
		displayEffort,
		displayMode,
		displayPersona,
		efforts,
		modes,
		personas,
		selectEffort,
		selectMode,
		selectPersona,
	} = useAgentCatalog({ agents, localDraft, projectId, threadId });

	return (
		<div className="scrollbar-none -m-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1 [&::-webkit-scrollbar]:hidden">
			<AgentModelPicker
				agents={agents}
				localDraft={localDraft}
				projectId={projectId}
				threadId={threadId}
			/>

			{isCompact ? (
				<CompactComposerControls
					agents={agents}
					localDraft={localDraft}
					projectId={projectId}
					threadId={threadId}
				/>
			) : (
				<>
					{modes.length > 0 && (
						<>
							<Separator
								className="mx-0.5 hidden h-4 sm:block"
								orientation="vertical"
							/>
							<CatalogSelect
								label="Mode"
								onValueChange={selectMode}
								options={modes}
								value={displayMode}
							/>
						</>
					)}
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

			<ComposerContextUsage usage={contextUsage} />
		</div>
	);
}
