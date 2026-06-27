import { authClient } from "@/lib/auth";

export default function Header() {
	const { data: session } = authClient.useSession();
	return (
		<header className="flex items-center justify-between border-b px-4 py-2">
			<a className="font-semibold" href="/">
				cyrus
			</a>
			<div className="flex items-center gap-2">
				{session?.user && <span className="text-sm">{session.user.name}</span>}
			</div>
		</header>
	);
}
