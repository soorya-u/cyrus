import { createFileRoute, redirect } from "@tanstack/react-router";
import { Hero } from "@/components/home/hero";
import { HomeNav } from "@/components/home/home-nav";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const { data } = await authClient.getSession();
		if (data?.user) throw redirect({ to: "/workers" });
	},
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
