import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ProviderButton } from "@/components/auth/provider-button";
import { Button } from "@/components/ui/button";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { useAuthDevice } from "@/hooks/auth/use-device";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/auth/device")({
	validateSearch: z.object({ user_code: z.string().optional() }),
	component: DevicePage,
});

function normalizeDeviceCode(value: string) {
	return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function DevicePage() {
	const { user_code: userCode } = Route.useSearch();
	const { data: session, isPending } = authClient.useSession();
	const [code, setCode] = useState(() => normalizeDeviceCode(userCode ?? ""));
	const { outcome, decide, isDeciding } = useAuthDevice();

	if (isPending) return <Spinner />;

	if (!session?.user) {
		const callbackUrl = `${window.location.origin}/auth/device${
			code ? `?user_code=${encodeURIComponent(code)}` : ""
		}`;
		return (
			<>
				<h1 className="font-medium text-2xl tracking-tight">
					Authorize device
				</h1>
				<p className="max-w-sm text-center text-muted-foreground text-sm">
					Sign in to connect a device to your Cyrus account.
				</p>
				<ProviderButton callbackUrl={callbackUrl} provider="github" />
			</>
		);
	}

	if (outcome === "approved") {
		return (
			<>
				<h1 className="font-medium text-2xl tracking-tight">
					Device connected
				</h1>
				<p className="text-muted-foreground text-sm">
					You can return to your terminal — it's signed in now.
				</p>
			</>
		);
	}

	if (outcome === "denied") {
		return (
			<>
				<h1 className="font-medium text-2xl tracking-tight">Request denied</h1>
				<p className="text-muted-foreground text-sm">
					The device was not connected.
				</p>
			</>
		);
	}

	return (
		<>
			<h1 className="font-medium text-2xl tracking-tight">Authorize device</h1>
			<p className="max-w-sm text-center text-muted-foreground text-sm">
				Confirm the code shown in your terminal to connect this device as{" "}
				<span className="text-foreground">{session.user.email}</span>.
			</p>
			<InputOTP
				autoFocus
				maxLength={8}
				onChange={(value) => setCode(normalizeDeviceCode(value))}
				value={code}
			>
				<InputOTPGroup>
					<InputOTPSlot
						className="h-11 w-11 font-mono text-lg uppercase"
						index={0}
					/>
					<InputOTPSlot
						className="h-11 w-11 font-mono text-lg uppercase"
						index={1}
					/>
					<InputOTPSlot
						className="h-11 w-11 font-mono text-lg uppercase"
						index={2}
					/>
					<InputOTPSlot
						className="h-11 w-11 font-mono text-lg uppercase"
						index={3}
					/>
				</InputOTPGroup>
				<InputOTPSeparator />
				<InputOTPGroup>
					<InputOTPSlot
						className="h-11 w-11 font-mono text-lg uppercase"
						index={4}
					/>
					<InputOTPSlot
						className="h-11 w-11 font-mono text-lg uppercase"
						index={5}
					/>
					<InputOTPSlot
						className="h-11 w-11 font-mono text-lg uppercase"
						index={6}
					/>
					<InputOTPSlot
						className="h-11 w-11 font-mono text-lg uppercase"
						index={7}
					/>
				</InputOTPGroup>
			</InputOTP>
			<div className="flex gap-3">
				<Button
					disabled={isDeciding}
					onClick={() => decide(code, false)}
					variant="outline"
				>
					{isDeciding ? <Spinner /> : "Deny"}
				</Button>
				<Button disabled={isDeciding} onClick={() => decide(code, true)}>
					{isDeciding ? <Spinner /> : "Approve"}
				</Button>
			</div>
		</>
	);
}
