import { log } from "evlog";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";

export function useAuthCallback() {
	const [done, setDone] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		const { success, error } = authClient.forwardToDesktop();
		if (success) {
			setDone(true);
			return;
		}

		log.error({
			kind: "auth_callback_forward",
			error,
			hash: window.location.hash,
		});
		setFailed(true);
	}, []);

	return { done, failed };
}
