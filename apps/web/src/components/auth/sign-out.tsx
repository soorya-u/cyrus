import { authClient } from "@/lib/auth";

export default function SignOut() {
	const { data } = authClient.useSession();
	if (!data?.user) return null;

	return (
		<button
			className="text-sm"
			onClick={() => authClient.signOut()}
			type="button"
		>
			Sign out
		</button>
	);
}
