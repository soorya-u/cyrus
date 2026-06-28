import type { Command } from "@commander-js/extra-typings";
import { login } from "./login";
import { logout } from "./logout";
import { whoami } from "./whoami";

export function registerAuthCommands(program: Command) {
	program.command("login").description("Sign in to Cyrus").action(login);

	program.command("logout").description("Sign out of Cyrus").action(logout);

	program
		.command("whoami")
		.description("Show the signed-in user")
		.option("-e, --email", "include the account email")
		.action(whoami);
}
