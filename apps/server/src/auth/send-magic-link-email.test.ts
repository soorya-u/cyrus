import { describe, expect, test, vi } from "vitest";
import {
	buildMagicLinkEmail,
	sendMagicLinkEmail,
} from "./send-magic-link-email";

describe("sendMagicLinkEmail", () => {
	test("sends Cyrus-branded payload through Resend", async () => {
		const send = vi.fn(async () => ({}));
		const resendClient = { emails: { send } };
		const signInUrl =
			"https://cyrus.soorya-u.dev/api/auth/magic-link/verify?token=123";

		await sendMagicLinkEmail({
			resendClient,
			fromEmail: "noreply@cyrus.test",
			toEmail: "person@cyrus.test",
			signInUrl,
		});

		expect(send).toHaveBeenCalledTimes(1);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				from: "noreply@cyrus.test",
				to: ["person@cyrus.test"],
				subject: "Sign in to Cyrus",
				html: expect.stringContaining(signInUrl),
				text: expect.stringContaining(signInUrl),
			})
		);
	});

	test("builds a sign-in template with the action URL", () => {
		const signInUrl = "https://example.com/sign-in";
		const template = buildMagicLinkEmail({ signInUrl });
		expect(template.subject).toBe("Sign in to Cyrus");
		expect(template.html).toContain(signInUrl);
		expect(template.text).toContain(signInUrl);
	});
});
