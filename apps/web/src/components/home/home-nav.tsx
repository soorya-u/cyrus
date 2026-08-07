import { useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export function HomeNav() {
	const navRef = useRef<HTMLElement>(null);

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
				<ThemeToggle />
			</div>
		</nav>
	);
}
