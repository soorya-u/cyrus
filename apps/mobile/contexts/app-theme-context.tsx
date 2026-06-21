import { createContext, useContext, useState } from "react";

const ThemeCtx = createContext({ theme: "dark", toggle: () => {} });

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, set] = useState("dark");
	return (
		<ThemeCtx.Provider
			value={{
				theme,
				toggle: () => set((t) => (t === "dark" ? "light" : "dark")),
			}}
		>
			{children}
		</ThemeCtx.Provider>
	);
}
export const useAppTheme = () => useContext(ThemeCtx);
