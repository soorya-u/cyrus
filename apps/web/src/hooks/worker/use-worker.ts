import { useWorkers } from "@cyrus/hooks/connection/use-workers";
import { useNavigate } from "@tanstack/react-router";

export const useWorker = () => {
	const navigate = useNavigate();
	const workers = useWorkers();

	const handleWorkerSelect = (value: string) => {
		if (!value) return navigate({ to: "/workers" });
		navigate({ to: "/workers/$workerId", params: { workerId: value } });
	};

	return {
		workers,
		handleWorkerSelect,
	};
};
