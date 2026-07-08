import { generateName, randomId } from "@cyrus/utils/identity";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CONTROLLER_IDENTITY } from "@/constants/storage-keys";

type IdentityState = {
	id: string;
	name: string;
	ensureId: () => string;
	ensureName: () => string;
};

export const useIdentityStore = create<IdentityState>()(
	persist(
		(set, get) => ({
			id: "",
			name: "",
			ensureId: () => {
				const { id } = get();
				if (id) return id;
				const next = randomId();
				set({ id: next });
				return next;
			},
			ensureName: () => {
				const { name } = get();
				if (name) return name;
				const next = generateName();
				set({ name: next });
				return next;
			},
		}),
		{ name: CONTROLLER_IDENTITY }
	)
);

export function getControllerId(): string {
	return useIdentityStore.getState().ensureId();
}

export function getControllerName(): string {
	return useIdentityStore.getState().ensureName();
}
