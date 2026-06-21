import { eq } from "drizzle-orm";
import { db } from "..";
import { device } from "../schema/cyrus";

export async function getDeviceById(id: string) {
	return await db.query.device.findFirst({ where: eq(device.id, id) });
}
