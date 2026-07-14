import { E2E_SERVER_URL } from "./env";

/** Mint fresh WS ticket protocols using a device access token (Bearer). */
export function wsTicketProtocols(
	token: string,
	serverUrl = E2E_SERVER_URL
): () => Promise<string[]> {
	return async () => {
		const response = await fetch(`${serverUrl}/api/auth/ws-ticket`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
			body: "{}",
		});
		if (!response.ok) {
			throw new Error(
				`ws-ticket mint failed: ${response.status} ${await response.text()}`
			);
		}
		const body = (await response.json()) as { protocols?: string[] };
		if (!body.protocols?.length) {
			throw new Error("ws-ticket response missing protocols.");
		}
		return body.protocols;
	};
}
