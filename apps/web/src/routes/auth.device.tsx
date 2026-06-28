import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ProviderButton } from "@/components/auth/provider-button";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/auth/device")({
	validateSearch: z.object({ user_code: z.string().optional() }),
	component: DevicePage,
});

type Outcome = "pending" | "approved" | "denied";

function errorMessage(error: { error_description?: string; message?: string }) {
	return error.error_description ?? error.message ?? "Something went wrong.";
}

function DevicePage() {
	const { user_code: userCode } = Route.useSearch();
	const { data: session, isPending } = authClient.useSession();
	const [code, setCode] = useState(userCode ?? "");
	const [busy, setBusy] = useState(false);
	const [outcome, setOutcome] = useState<Outcome>("pending");

	if (isPending) {
		return (
			<Centered>
				<Spinner />
			</Centered>
		);
	}

	// Approve/deny require an authenticated session — the code is linked to the
	// signed-in user. Bounce through GitHub sign-in, returning here with the code.
	if (!session?.user) {
		const callbackUrl = `${window.location.origin}/auth/device${
			code ? `?user_code=${encodeURIComponent(code)}` : ""
		}`;
		return (
			<Centered>
				<h1 className="font-medium text-2xl tracking-tight">
					Authorize device
				</h1>
				<p className="max-w-sm text-center text-muted-foreground text-sm">
					Sign in to connect a device to your Cyrus account.
				</p>
				<ProviderButton callbackUrl={callbackUrl} provider="github" />
			</Centered>
		);
	}

	if (outcome === "approved") {
		return (
			<Centered>
				<h1 className="font-medium text-2xl tracking-tight">
					Device connected
				</h1>
				<p className="text-muted-foreground text-sm">
					You can return to your terminal — it’s signed in now.
				</p>
			</Centered>
		);
	}

	if (outcome === "denied") {
		return (
			<Centered>
				<h1 className="font-medium text-2xl tracking-tight">Request denied</h1>
				<p className="text-muted-foreground text-sm">
					The device was not connected.
				</p>
			</Centered>
		);
	}

	const decide = async (approve: boolean) => {
		const userCode = code.trim();
		if (!userCode) {
			toast.error("Enter the code shown in your terminal.");
			return;
		}
		setBusy(true);
		try {
			// GET /device claims the code for the signed-in user. Approve/deny
			// then act on a claimed code.
			await authClient.$fetch("/device", {
				method: "GET",
				query: { user_code: userCode },
			});
			const { error } = approve
				? await authClient.device.approve({ userCode })
				: await authClient.device.deny({ userCode });
			if (error) {
				toast.error(errorMessage(error));
				return;
			}
			setOutcome(approve ? "approved" : "denied");
		} catch (err) {
			toast.error(errorMessage(err as { message?: string }));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Centered>
			<h1 className="font-medium text-2xl tracking-tight">Authorize device</h1>
			<p className="max-w-sm text-center text-muted-foreground text-sm">
				Confirm the code shown in your terminal to connect this device as{" "}
				<span className="text-foreground">{session.user.email}</span>.
			</p>
			<input
				autoCapitalize="characters"
				autoComplete="off"
				className="h-11 w-64 rounded-md border bg-background text-center font-mono text-lg uppercase tracking-[0.3em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
				onChange={(e) => setCode(e.target.value)}
				placeholder="XXXX-XXXX"
				spellCheck={false}
				value={code}
			/>
			<div className="flex gap-3">
				<Button disabled={busy} onClick={() => decide(false)} variant="outline">
					Deny
				</Button>
				<Button disabled={busy} onClick={() => decide(true)}>
					{busy ? <Spinner /> : "Approve"}
				</Button>
			</div>
		</Centered>
	);
}

function Centered({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-(--home-page-bg) px-6 text-foreground antialiased">
			{children}
		</div>
	);
}
