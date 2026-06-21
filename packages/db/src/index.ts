import { env } from "@cyrus/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import {
	account,
	accountRelations,
	device,
	session,
	sessionRelations,
	thread,
	user,
	userRelations,
	verification,
	worker,
} from "./schema";

export function createDb() {
	return drizzle(env.DATABASE_URL, {
		schema: {
			account,
			accountRelations,
			device,
			session,
			sessionRelations,
			thread,
			user,
			userRelations,
			verification,
			worker,
		},
	});
}

export const db = createDb();
