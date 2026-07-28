import { describe, expect, test, vi } from "vitest";
import { env } from "../config/env";
import { resend } from "./index";

describe("magic email", () => {
	test("builds a magic-link template with the action URL", async () => {
		const { buildMagicLinkEmail } = await import("./magic-email");
		const email = "person@cyrus.test";
		const url = "https://example.com/sign-in";
		const template = await buildMagicLinkEmail({ email, url });
		expect(template.subject).toBe("Sign in to Cyrus");
		expect(template.html).toContain(url);
		expect(template.html).toContain(email);
		expect(template.text).toContain(url);
	});

	test("sends Cyrus-branded payload through Resend", async () => {
		const { sendMagicLinkEmail } = await import("./magic-email");
		const sendSpy = vi
			.spyOn(resend.emails, "send")
			.mockImplementation(
				async () => ({}) as Awaited<ReturnType<typeof resend.emails.send>>
			);
		const url =
			"https://cyrus.soorya-u.dev/api/auth/magic-link/verify?token=123";

		await sendMagicLinkEmail({
			email: "person@cyrus.test",
			url,
		});

		try {
			expect(sendSpy).toHaveBeenCalledTimes(1);
			expect(sendSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					from: env.RESEND_FROM_EMAIL,
					to: ["person@cyrus.test"],
					subject: "Sign in to Cyrus",
					html: expect.stringContaining(url),
					text: expect.stringContaining(url),
				})
			);
			expect(sendSpy.mock.calls[0]?.[0]?.html).toContain("person@cyrus.test");
		} finally {
			sendSpy.mockRestore();
		}
	});
});
