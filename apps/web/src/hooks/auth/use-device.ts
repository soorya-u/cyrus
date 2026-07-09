import { AUTH_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useMutation } from "@tanstack/react-query";
import { log } from "evlog";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth";

export type DeviceOutcome = "pending" | "approved" | "denied";

function formatDeviceCode(value: string) {
	const normalized = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
	if (normalized.length <= 4) {
		return normalized;
	}
	return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`;
}

export function useAuthDevice() {
	const [outcome, setOutcome] = useState<DeviceOutcome>("pending");

	const decideMutation = useMutation({
		mutationKey: AUTH_OPERATION_KEYS.deviceDecide,
		mutationFn: async ({
			userCode,
			approve,
		}: {
			userCode: string;
			approve: boolean;
		}) => {
			const formattedCode = formatDeviceCode(userCode);
			if (!formattedCode) {
				throw new Error("missing_user_code");
			}

			await authClient.device({ query: { user_code: formattedCode } });
			const { error } = approve
				? await authClient.device.approve({ userCode: formattedCode })
				: await authClient.device.deny({ userCode: formattedCode });

			if (error) {
				throw error;
			}

			return approve;
		},
		onSuccess: (approve) => {
			setOutcome(approve ? "approved" : "denied");
		},
		onError: (error) => {
			if (error instanceof Error && error.message === "missing_user_code") {
				toast.error("Enter the code shown in your terminal.");
				return;
			}

			log.error({ kind: "auth_device_decide", error });
			toast.error("Couldn't authorize this device. Please try again.");
		},
	});

	const decide = (userCode: string, approve: boolean) => {
		decideMutation.mutate({ userCode, approve });
	};

	return {
		outcome,
		decide,
		isDeciding: decideMutation.isPending,
	};
}
