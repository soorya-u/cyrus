import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

export function HomeNav() {
	const navRef = useRef<HTMLElement>(null);
	const { resolvedTheme, setTheme } = useTheme();

	useEffect(() => {
		const nav = navRef.current;
		if (!nav) {
			return;
		}
		const onScroll = () => {
			nav.style.borderBottomColor =
				window.scrollY > 12 ? "var(--home-nav-scroll-border)" : "transparent";
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		onScroll();
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<nav
			className="sticky top-0 z-50 border-transparent border-b backdrop-blur-[18px] transition-[border-color] duration-300"
			ref={navRef}
			style={{ background: "var(--home-nav-bg)" }}
		>
			<div className="flex items-center justify-end gap-6 px-12 py-4">
				<button
					aria-label="Toggle theme"
					className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
					onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
					type="button"
				>
					<Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				</button>
			</div>
		</nav>
	);
}
