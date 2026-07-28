import { MagicLinkEmail } from "@better-auth-ui/react/email";
import { render } from "@react-email/render";
import { createElement } from "react";
import { resend } from "./index";

function magicLinkElement({
	email,
	signInUrl,
}: {
	email: string;
	signInUrl: string;
}) {
	return createElement(MagicLinkEmail, {
		appName: "Cyrus",
		darkMode: true,
		email,
		expirationMinutes: 5,
		poweredBy: true,
		url: signInUrl,
	});
}

export async function buildMagicLinkEmail({
	email,
	signInUrl,
}: {
	email: string;
	signInUrl: string;
}): Promise<{
	subject: string;
	html: string;
	text: string;
}> {
	const element = magicLinkElement({ email, signInUrl });
	const [html, text] = await Promise.all([
		render(element),
		render(element, { plainText: true }),
	]);

	return {
		subject: "Sign in to Cyrus",
		html,
		text,
	};
}

export async function sendMagicLinkEmail({
	fromEmail,
	toEmail,
	signInUrl,
}: {
	fromEmail: string;
	toEmail: string;
	signInUrl: string;
}): Promise<void> {
	const template = await buildMagicLinkEmail({
		email: toEmail,
		signInUrl,
	});
	await resend.emails.send({
		from: fromEmail,
		to: [toEmail],
		...template,
	});
}
