type ResendClient = {
	emails: {
		send: (payload: {
			from: string;
			to: string[];
			subject: string;
			html: string;
			text: string;
		}) => Promise<unknown>;
	};
};

export type SendMagicLinkEmailOptions = {
	resendClient: ResendClient;
	fromEmail: string;
	toEmail: string;
	signInUrl: string;
};

export function buildMagicLinkEmail({ signInUrl }: { signInUrl: string }): {
	subject: string;
	html: string;
	text: string;
} {
	const subject = "Sign in to Cyrus";
	return {
		subject,
		html: `<div style="font-family: Inter, system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <h1 style="font-size: 20px; margin-bottom: 12px;">Sign in to Cyrus</h1>
  <p style="margin-bottom: 12px;">Use the button below to sign in.</p>
  <p style="margin-bottom: 20px;">
    <a href="${signInUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Sign in</a>
  </p>
  <p style="font-size: 13px; color: #6b7280;">If you didn&apos;t request this link, you can ignore this email.</p>
</div>`,
		text: `Sign in to Cyrus\n\nOpen this link to sign in:\n${signInUrl}\n\nIf you did not request this link, you can ignore this email.`,
	};
}

export async function sendMagicLinkEmail({
	resendClient,
	fromEmail,
	toEmail,
	signInUrl,
}: SendMagicLinkEmailOptions): Promise<void> {
	const template = buildMagicLinkEmail({ signInUrl });
	await resendClient.emails.send({
		from: fromEmail,
		to: [toEmail],
		subject: template.subject,
		html: template.html,
		text: template.text,
	});
}
