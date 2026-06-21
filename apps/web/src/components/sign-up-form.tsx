import { useState } from "react";
import { authClient } from "@/lib/auth";

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await authClient.signUp.email({ email, password, name });
	};

	return (
		<div className="mx-auto max-w-sm p-6">
			<h1 className="mb-4 font-semibold text-xl">Create account</h1>
			<form className="space-y-3" onSubmit={handleSubmit}>
				<input
					className="w-full border p-2"
					onChange={(e) => setName(e.target.value)}
					placeholder="Name"
					value={name}
				/>
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
					Sign up
				</button>
			</form>
			<button className="mt-2 text-sm underline" onClick={onSwitchToSignIn}>
				Already have an account
			</button>
		</div>
	);
}
