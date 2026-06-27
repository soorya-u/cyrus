// biome-ignore lint/style/useConsistentTypeDefinitions: Electrobun injects this into every WebView; used to detect desktop context.
interface Window {
	__electrobunWebviewId?: number;
}
