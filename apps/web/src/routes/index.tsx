import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/home/hero";
import { HomeNav } from "@/components/home/home-nav";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<div className="flex min-h-screen flex-col overflow-x-hidden bg-(--home-page-bg) text-foreground antialiased">
			<HomeNav />
			<main className="flex flex-1 flex-col">
				<Hero />
			</main>
		</div>
	);
}
