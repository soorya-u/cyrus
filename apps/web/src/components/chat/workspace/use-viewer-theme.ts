import { useTheme } from "next-themes";
import { useMemo } from "react";

/** Syntax theme for the diff / file viewers, following the app's light or dark mode. */
export function useViewerTheme() {
	const { resolvedTheme } = useTheme();
	const themeType = resolvedTheme === "dark" ? "dark" : "light";
	return useMemo(
		() => ({
			theme: { dark: "github-dark", light: "github-light" } as const,
			themeType: themeType as "dark" | "light",
		}),
		[themeType]
	);
}
