import { generateName, randomId } from "@cyrus/utils/identity";
import { getItemAsync, setItemAsync } from "expo-secure-store";

const ID_KEY = "cyrus:controller-id";
const NAME_KEY = "cyrus:controller-name";

export async function getControllerId(): Promise<string> {
	const existing = await getItemAsync(ID_KEY);
	if (existing) return existing;
	const id = randomId();
	await setItemAsync(ID_KEY, id);
	return id;
}

export async function getControllerName(): Promise<string> {
	const existing = await getItemAsync(NAME_KEY);
	if (existing) return existing;
	const name = generateName();
	await setItemAsync(NAME_KEY, name);
	return name;
}
