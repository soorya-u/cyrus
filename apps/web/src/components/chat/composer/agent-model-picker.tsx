import { useAgentCatalog } from "@cyrus/hooks/connection/use-agent-catalog";
import { cn } from "cnfast";
import { BotIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function CatalogOptionIcon({ src }: { src: string }) {
	const ref = useRef<HTMLImageElement>(null);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const img = ref.current;
		if (!img) return;
		const handleError = () => setVisible(false);
		img.addEventListener("error", handleError);
		return () => img.removeEventListener("error", handleError);
	}, []);

	if (!visible) return <BotIcon className="size-4 shrink-0" />;

	return (
		<img
			alt=""
			className="size-4 shrink-0"
			height={16}
			ref={ref}
			src={src}
			width={16}
		/>
	);
}

export function AgentModelPicker({
	projectId,
	threadId,
}: {
	projectId: string;
	threadId: string;
}) {
	const {
		agents,
		models,
		selectAgent,
		selectedAgent,
		selectedModel,
		selectModel,
	} = useAgentCatalog({ projectId, threadId });

	const activeAgent = agents.find((agent) => agent.id === selectedAgent);
	const activeModel = models.find((model) => model.id === selectedModel);

	if (agents.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className="h-8 min-w-0 max-w-48 shrink justify-between gap-1.5 whitespace-nowrap border-none bg-transparent px-2 text-muted-foreground/70 shadow-none hover:bg-accent hover:text-foreground/80 sm:max-w-56 sm:px-3"
					size="sm"
					type="button"
					variant="ghost"
				>
					<span className="flex min-w-0 flex-1 items-center gap-2">
						{activeAgent?.icon && <CatalogOptionIcon src={activeAgent.icon} />}
						<span className="truncate">
							{activeModel?.name ?? activeAgent?.name ?? "Agent"}
						</span>
					</span>
					<ChevronDownIcon className="size-3 shrink-0 opacity-60" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="w-80 p-0"
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				<div className="flex max-h-72">
					<div className="flex w-32 shrink-0 flex-col gap-0.5 border-border/60 border-r p-1">
						{agents.map((agent) => (
							<button
								className={cn(
									"flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
									agent.id === selectedAgent && "bg-accent text-foreground"
								)}
								key={agent.id}
								onClick={() => selectAgent(agent.id)}
								type="button"
							>
								{agent.icon && <CatalogOptionIcon src={agent.icon} />}
								<span className="truncate">{agent.name}</span>
							</button>
						))}
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1">
						{models.map((model) => (
							<button
								className={cn(
									"rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
									model.id === selectedModel && "bg-accent text-foreground"
								)}
								key={model.id}
								onClick={() => selectModel(model.id)}
								type="button"
							>
								{model.name}
							</button>
						))}
					</div>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
