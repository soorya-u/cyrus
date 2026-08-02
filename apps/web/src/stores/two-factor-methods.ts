import type { TwoFactorMethod } from "@better-auth-ui/core/plugins";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { TWO_FACTOR_METHODS } from "@/constants/storage-keys";

/** Auth plugin id used by Better Auth UI's two-factor integration. */
export const TWO_FACTOR_PLUGIN_ID = "twoFactor";

const DEFAULT_TWO_FACTOR_METHODS: TwoFactorMethod[] = ["totp", "otp"];

type TwoFactorMethodsState = {
	methods: TwoFactorMethod[];
	setMethods: (methods: TwoFactorMethod[]) => void;
	clearMethods: () => void;
	getMethods: () => TwoFactorMethod[];
};

export const useTwoFactorMethodsStore = create<TwoFactorMethodsState>()(
	persist(
		(set, get) => ({
			methods: [],
			setMethods: (methods) => {
				set({ methods });
			},
			clearMethods: () => {
				set({ methods: [] });
			},
			getMethods: () => {
				const { methods } = get();
				return methods.length > 0 ? methods : DEFAULT_TWO_FACTOR_METHODS;
			},
		}),
		{
			name: TWO_FACTOR_METHODS,
			storage: createJSONStorage(() => sessionStorage),
		}
	)
);
