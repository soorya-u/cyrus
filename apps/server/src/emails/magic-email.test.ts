import { describe, expect, test, vi } from "vitest";
import { resend } from "./index";

describe("magic email", () => {
	test("builds a magic-link template with the action URL", async () => {
		const { buildMagicLinkEmail } = await import("./magic-email");
		const email = "person@cyrus.test";
		const signInUrl = "https://example.com/sign-in";
		const template = await buildMagicLinkEmail({ email, signInUrl });
		expect(template.subject).toBe("Sign in to Cyrus");
		expect(template.html).toContain(signInUrl);
		expect(template.html).toContain(email);
		expect(template.text).toContain(signInUrl);
	});

	test("sends Cyrus-branded payload through Resend", async () => {
		const { sendMagicLinkEmail } = await import("./magic-email");
		const sendSpy = vi
			.spyOn(resend.emails, "send")
			.mockImplementation(
				async () => ({}) as Awaited<ReturnType<typeof resend.emails.send>>
			);
		const signInUrl =
			"https://cyrus.soorya-u.dev/api/auth/magic-link/verify?token=123";

		await sendMagicLinkEmail({
			fromEmail: "noreply@cyrus.test",
			toEmail: "person@cyrus.test",
			signInUrl,
		});

		try {
			expect(sendSpy).toHaveBeenCalledTimes(1);
			expect(sendSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					from: "noreply@cyrus.test",
					to: ["person@cyrus.test"],
					subject: "Sign in to Cyrus",
					html: expect.stringContaining(signInUrl),
					text: expect.stringContaining(signInUrl),
				})
			);
			expect(sendSpy.mock.calls[0]?.[0]?.html).toContain("person@cyrus.test");
		} finally {
			sendSpy.mockRestore();
		}
	});
});
