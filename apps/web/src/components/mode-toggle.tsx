import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
	const { setTheme, theme } = useTheme();
	return (
		<Button
			onClick={() => setTheme(theme === "light" ? "dark" : "light")}
			size="icon"
			variant="ghost"
		>
			<Sun className="h-4 w-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
			<Moon className="absolute h-4 w-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
		</Button>
	);
}
