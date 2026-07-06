import { create } from "zustand";

type WorkerState = {
	lastWorkerId: string | null;
	setLastWorkerId: (workerId: string) => void;
};

export const useWorkerStore = create<WorkerState>((set) => ({
	lastWorkerId: null,
	setLastWorkerId: (workerId) => set({ lastWorkerId: workerId }),
}));
