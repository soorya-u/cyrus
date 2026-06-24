import { createAuthClient } from "better-auth/client";
import { cliClient } from "../cli-plugin";

export const authClient = createAuthClient({
	baseURL: "http://localhost:3000",
	plugins: [
		cliClient({
			storage: {
				setItem: (key, value) => localStorage.setItem(key, value),
				getItem: (key) => localStorage.getItem(key),
			},
		}),
	],
});
