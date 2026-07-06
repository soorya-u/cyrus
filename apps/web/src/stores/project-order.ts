import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PROJECT_ORDER } from "@/constants/storage-keys";

type ProjectOrderState = {
	projectOrder: string[];
	setProjectOrder: (
		order: string[] | ((current: string[]) => string[])
	) => void;
};

export const useProjectOrderStore = create<ProjectOrderState>()(
	persist(
		(set) => ({
			projectOrder: [],
			setProjectOrder: (order) =>
				set((state) => ({
					projectOrder:
						typeof order === "function" ? order(state.projectOrder) : order,
				})),
		}),
		{ name: PROJECT_ORDER }
	)
);
