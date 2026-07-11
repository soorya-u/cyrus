import { useAgentCatalog } from "@cyrus/hooks/connection/use-agent-catalog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const TRIGGER_CLASS =
	"h-8 min-w-0 max-w-40 shrink justify-between gap-1.5 whitespace-nowrap border-none bg-transparent px-2 text-muted-foreground/70 shadow-none hover:bg-accent hover:text-foreground/80 sm:max-w-48 sm:px-3";

type CatalogOption = {
	id: string;
	name: string;
	icon?: string;
};

function CatalogSelect({
	label,
	value,
	onValueChange,
	options,
}: {
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	options: CatalogOption[];
}) {
	if (options.length === 0) {
		return null;
	}

	return (
		<Select onValueChange={onValueChange} value={value}>
			<SelectTrigger className={TRIGGER_CLASS} size="sm">
				<SelectValue placeholder={label} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.id} value={option.id}>
						<span className="flex items-center gap-2">
							{option.icon ? (
								<img
									alt=""
									className="size-4 shrink-0"
									height={16}
									src={option.icon}
									width={16}
								/>
							) : null}
							<span>{option.name}</span>
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function ComposerFooterControls({
	projectId,
	threadId,
}: {
	projectId: string;
	threadId: string;
}) {
	const {
		agents,
		efforts,
		models,
		personas,
		selectAgent,
		selectedAgent,
		selectedEffort,
		selectedModel,
		selectedPersona,
		selectEffort,
		selectModel,
		selectPersona,
	} = useAgentCatalog({ projectId, threadId });

	return (
		<div className="scrollbar-none -m-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1 [&::-webkit-scrollbar]:hidden">
			<CatalogSelect
				label="Agent"
				onValueChange={selectAgent}
				options={agents.map((agent) => ({
					id: agent.id,
					name: agent.name,
					icon: agent.icon,
				}))}
				value={selectedAgent}
			/>

			<Separator
				className="mx-0.5 hidden h-4 sm:block"
				orientation="vertical"
			/>

			<CatalogSelect
				label="Model"
				onValueChange={selectModel}
				options={models}
				value={selectedModel}
			/>

			<Separator
				className="mx-0.5 hidden h-4 sm:block"
				orientation="vertical"
			/>

			<CatalogSelect
				label="Effort"
				onValueChange={selectEffort}
				options={efforts}
				value={selectedEffort}
			/>

			<Separator
				className="mx-0.5 hidden h-4 sm:block"
				orientation="vertical"
			/>

			<CatalogSelect
				label="Persona"
				onValueChange={selectPersona}
				options={personas}
				value={selectedPersona}
			/>
		</div>
	);
}
