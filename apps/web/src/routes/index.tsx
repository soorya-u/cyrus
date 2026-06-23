import { createFileRoute } from "@tanstack/react-router";
import { WebChatApp } from "@/components/web-chat-app";

export const Route = createFileRoute("/")({
	component: WebChatApp,
});
