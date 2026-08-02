import { MagicLinkEmail } from "@better-auth-ui/react/email";
import { render } from "@react-email/render";
import { createElement } from "react";
import { env } from "../config/env";
import { resend } from "./index";

type EmailParams = {
	email: string;
	url: string;
};

function magicLinkElement(params: EmailParams) {
	return createElement(MagicLinkEmail, {
		appName: "Cyrus",
		darkMode: true,
		expirationMinutes: 5,
		poweredBy: true,
		...params,
	});
}

export async function buildMagicLinkEmail(params: EmailParams): Promise<{
	subject: string;
	html: string;
	text: string;
}> {
	const element = magicLinkElement(params);
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

export async function sendMagicLinkEmail(params: EmailParams): Promise<void> {
	const template = await buildMagicLinkEmail(params);
	const { error } = await resend.emails.send({
		from: env.RESEND_FROM_EMAIL,
		to: [params.email],
		...template,
	});
	if (error) {
		throw error;
	}
}
