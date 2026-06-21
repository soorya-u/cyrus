import { authClient } from "@/lib/auth";

export default function UserMenu() {
	const { data } = authClient.useSession();
	if (!data?.user) {
		return null;
	}
	return (
		<button className="text-sm" onClick={() => authClient.signOut()}>
			Sign out
		</button>
	);
}
