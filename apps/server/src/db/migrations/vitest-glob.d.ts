// biome-ignore lint/style/useConsistentTypeDefinitions: must interface-merge ImportMeta
interface ImportMeta {
	glob(
		pattern: string,
		options: {
			query: string;
			import: string;
			eager: true;
		}
	): Record<string, string>;
}
