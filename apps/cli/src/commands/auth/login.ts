import { generateName } from "@cyrus/utils/identity";
import { Result } from "better-result";
import { authClient } from "@/lib/auth";
import { getOrCreate, set } from "@/store/config";
import { createSpinner } from "@/utils/spinner";
import { blue, bold, cyan, print, underline } from "@/utils/style";

export const CLIENT_ID = "cyrusd";
export const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

export async function login(): Promise<void> {
	const { data, error } = await authClient.device.code({
		client_id: CLIENT_ID,
		scope: "openid profile email",
	});
	if (error || !data) {
		print.error`Failed to start login: ${error?.error_description ?? "unknown error"}`;
		process.exit(1);
	}

	const {
		device_code: deviceCode,
		user_code: userCode,
		verification_uri: verificationUri,
		verification_uri_complete: verificationUriComplete,
		expires_in: expiresIn,
		interval: pollInterval,
	} = data;

	print.line`\nTo sign in, visit:\n`;
	print.line`  ${underline(blue(verificationUriComplete ?? verificationUri))}\n`;
	print.line`and enter the code:  ${bold(cyan(userCode))}\n`;

	const spinner = createSpinner("Waiting for approval…");
	spinner.start();

	let interval = (pollInterval ?? 5) * 1000;
	const deadline = Date.now() + (expiresIn ?? 1800) * 1000;

	while (Date.now() < deadline) {
		await Bun.sleep(interval);
		const poll = await Result.tryPromise({
			try: () =>
				authClient.device.token({
					grant_type: GRANT_TYPE,
					device_code: deviceCode,
					client_id: CLIENT_ID,
				}),
			catch: () => ({
				data: null,
				error: { error: "authorization_pending", error_description: "" },
			}),
		});
		const { data: token, error: tokenError } = poll.isOk()
			? poll.value
			: {
					data: null,
					error: { error: "authorization_pending", error_description: "" },
				};
		const accessToken = token?.access_token;

		if (accessToken) {
			await set("token", accessToken);
			await Result.tryPromise(() => getOrCreate("name", generateName));
			const session = await authClient.getSession();
			const email = session.data?.user?.email;
			spinner.success(`Logged in${email ? ` as ${email}` : ""}.`);
			return;
		}

		switch (tokenError?.error) {
			case "authorization_pending":
				break;
			case "slow_down":
				interval += 5000;
				break;
			case "access_denied":
				spinner.error("Access denied.");
				process.exit(1);
				break;
			case "expired_token":
				spinner.error("Code expired. Run `cyrusd login` again.");
				process.exit(1);
				break;
			default:
				spinner.error(
					`Login failed: ${tokenError?.error_description ?? "unknown error"}`
				);
				process.exit(1);
		}
	}

	spinner.error("Code expired. Run `cyrusd login` again.");
	process.exit(1);
}
