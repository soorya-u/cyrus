import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SidebarGroup } from "@/components/ui/sidebar";
import { useWorker } from "@/hooks/use-worker";

type WorkerSelectProps = {
	workerId?: string;
};

// TODO: Handle Empty State
export function WorkerSelect({ workerId }: WorkerSelectProps) {
	const { handleWorkerSelect, workers } = useWorker();

	return (
		<SidebarGroup className="px-2 py-2">
			<Select
				onValueChange={handleWorkerSelect}
				{...(workerId ? { value: workerId } : {})}
			>
				<SelectTrigger className="max-h-8 w-full">
					<SelectValue placeholder="Select a worker" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>Workers</SelectLabel>
						{workers.map((worker) => (
							<SelectItem key={worker.id} value={worker.id}>
								{worker.name}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</SidebarGroup>
	);
}
