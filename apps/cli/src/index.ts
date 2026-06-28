#!/usr/bin/env bun
import { Command } from "@commander-js/extra-typings";
import { login } from "./commands/auth/login";
import { logout } from "./commands/auth/logout";
import { whoami } from "./commands/auth/whoami";

const program = new Command().name("cyrus").description("Cyrus CLI");

program.command("login").description("Sign in to Cyrus").action(login);
program.command("logout").description("Sign out of Cyrus").action(logout);
program.command("whoami").description("Show the signed-in user").action(whoami);

program.parse(Bun.argv);
