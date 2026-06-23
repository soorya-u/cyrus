import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const router = useRouter();

	const handleSubmit = async (e: React.SubmitEvent) => {
		e.preventDefault();
		const res = await authClient.signIn.email({ email, password });
		if (res.data) {
			router.navigate({ to: "/dashboard" });
		}
	};

	return (
		<div className="mx-auto max-w-sm p-6">
			<h1 className="mb-4 font-semibold text-xl">Sign in</h1>
			<form className="space-y-3" onSubmit={handleSubmit}>
				<input
					className="w-full border p-2"
					onChange={(e) => setEmail(e.target.value)}
					placeholder="Email"
					value={email}
				/>
				<input
					className="w-full border p-2"
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Password"
					type="password"
					value={password}
				/>
				<button className="w-full bg-black p-2 text-white" type="submit">
					Sign in
				</button>
			</form>
			<button
				className="mt-2 text-sm underline"
				onClick={onSwitchToSignUp}
				type="button"
			>
				Create account
			</button>
			<div className="my-2">or</div>
			<button
				className="w-full border p-2"
				onClick={() => authClient.signIn.social({ provider: "github" })}
				type="button"
			>
				Continue with GitHub
			</button>
		</div>
	);
}
