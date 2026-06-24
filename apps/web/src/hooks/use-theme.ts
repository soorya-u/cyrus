import { useEffect, useState } from "react";
import { useMediaQuery } from "./use-media-query";

export type Theme = "light" | "dark" | "system";

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => {
		if (typeof window === "undefined") {
			return "system";
		}
		return (localStorage.getItem("theme") as Theme) || "system";
	});
	const systemDark = useMediaQuery("(prefers-color-scheme: dark)");

	useEffect(() => {
		const root = document.documentElement;
		const isDark = theme === "dark" || (theme === "system" && systemDark);
		root.classList.toggle("dark", isDark);
		localStorage.setItem("theme", theme);
	}, [theme, systemDark]);

	const setTheme = (t: Theme) => setThemeState(t);

	return { theme, setTheme, systemDark };
}
