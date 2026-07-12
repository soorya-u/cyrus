import { formatElapsedTimerNow } from "@cyrus/utils/timer";
import { useEffect, useRef } from "react";
import { Marker, MarkerContent } from "@/components/ui/marker";

export function WorkingMarker({ startedAt }: { startedAt: string }) {
	const textRef = useRef<HTMLSpanElement>(null);
	const initialText = formatElapsedTimerNow(startedAt);

	useEffect(() => {
		const updateText = () => {
			if (textRef.current)
				textRef.current.textContent = formatElapsedTimerNow(startedAt);
		};
		updateText();
		const id = window.setInterval(updateText, 1000);
		return () => window.clearInterval(id);
	}, [startedAt]);

	return (
		<Marker className="py-0.5 pl-1.5" role="status">
			<MarkerContent className="shimmer text-[11px] text-muted-foreground/70 tabular-nums">
				Working for <span ref={textRef}>{initialText}</span>
			</MarkerContent>
		</Marker>
	);
}
