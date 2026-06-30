import { generateSlug } from "random-word-slugs";

export function generateId(): string {
	return Bun.randomUUIDv7();
}

export function generateName(): string {
	return generateSlug(2, { partsOfSpeech: ["adjective", "noun"] });
}
