import { generateSlug } from "random-word-slugs";
import { CONTROLLER_ID, CONTROLLER_NAME } from "@/constants/storage-keys";

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
	return getOrCreate(CONTROLLER_ID, generateId);
}

export function getControllerName(): string {
	return getOrCreate(CONTROLLER_NAME, generateName);
}
