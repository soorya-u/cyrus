import { env } from "@cyrus/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import {
	account,
	accountRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
} from "./schema";

export const db = drizzle(env.DATABASE_URL, {
	schema: {
		account,
		accountRelations,
		session,
		sessionRelations,
		user,
		userRelations,
		verification,
	},
});
