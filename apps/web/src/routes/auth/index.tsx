import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LoginForm } from "@/components/login-form";
import { normalizeCallbackPath, toAbsoluteCallbackUrl } from "@/utils/callback";

const searchSchema = z.object({
	callbackUrl: z.string().optional(),
});

export const Route = createFileRoute("/auth/")({
	validateSearch: searchSchema,
	component: AuthPage,
});

function AuthPage() {
	const { callbackUrl } = Route.useSearch();
	const callbackPath = normalizeCallbackPath(callbackUrl);
	const absoluteCallbackUrl = callbackPath
		? toAbsoluteCallbackUrl(callbackPath)
		: undefined;

	return <LoginForm callbackUrl={absoluteCallbackUrl} />;
}
