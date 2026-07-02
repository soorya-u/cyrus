"use client";

import { useNavigate } from "@tanstack/react-router";
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
import { MOCK_WORKERS } from "@/mocks/mock-workers";

type WorkerSelectProps = {
	workerId?: string;
};

export function WorkerSelect({ workerId }: WorkerSelectProps) {
	const navigate = useNavigate();

	return (
		<SidebarGroup className="px-2 py-2">
			<Select
				onValueChange={(value) => {
					if (!value) return navigate({ to: "/workers" });
					navigate({ to: "/workers/$workerId", params: { workerId: value } });
				}}
				{...(workerId ? { value: workerId } : {})}
			>
				<SelectTrigger className="max-h-8 w-full">
					<SelectValue placeholder="Select a worker" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>Workers</SelectLabel>
						{MOCK_WORKERS.map((worker) => (
							<SelectItem key={worker.id} value={worker.id}>
								{worker.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</SidebarGroup>
	);
}
