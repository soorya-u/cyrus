import { Result } from "better-result";
import { useState } from "react";

export function useCopyToClipboard(): {
	copied: boolean;
	copy: (text: string) => Promise<void>;
} {
	const [copied, setCopied] = useState(false);

	async function copyPrimitive(text: string) {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			await navigator.clipboard.writeText(text);
		} else if (typeof document !== "undefined") {
			const ta = document.createElement("textarea");
			ta.value = text;
			ta.style.position = "fixed";
			ta.style.opacity = "0";
			document.body.appendChild(ta);
			ta.select();
			document.execCommand("copy");
			document.body.removeChild(ta);
		}
		setCopied(true);
		setTimeout(() => setCopied(false), 1400);
	}

	async function copy(text: string) {
		(await Result.tryPromise(() => copyPrimitive(text))).tapError(() =>
			setCopied(false)
		);
	}
	return { copied, copy };
}
