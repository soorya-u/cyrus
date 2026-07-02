import { generateSlug } from "random-word-slugs";

const ID_KEY = "cyrus-controller-id";
const NAME_KEY = "cyrus-controller-name";

function generateId(): string {
	return crypto.randomUUID();
}

function generateName(): string {
	return generateSlug(2, { partsOfSpeech: ["adjective", "noun"] });
}

function getOrCreate(key: string, create: () => string): string {
	const existing = localStorage.getItem(key);
	if (existing) {
		return existing;
	}
	const value = create();
	localStorage.setItem(key, value);
	return value;
}

export function getControllerId(): string {
	return getOrCreate(ID_KEY, generateId);
}

export function getControllerName(): string {
	return getOrCreate(NAME_KEY, generateName);
}
