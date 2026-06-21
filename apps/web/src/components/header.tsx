import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth";

export default function Header() {
	const { data: session } = authClient.useSession();
	return (
		<header className="flex items-center justify-between border-b px-4 py-2">
			<Link className="font-semibold" to="/">
				cyrus
			</Link>
			<div className="flex items-center gap-2">
				{session?.user ? (
					<span className="text-sm">{session.user.name}</span>
				) : (
					<Link to="/login">Login</Link>
				)}
			</div>
		</header>
	);
}
