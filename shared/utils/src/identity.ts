import { generateSlug } from "random-word-slugs";

export function randomId(): string {
	return crypto.randomUUID();
}

export function generateName(): string {
	return generateSlug(2, { partsOfSpeech: ["adjective", "noun"] });
}
