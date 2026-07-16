import { formatElapsedTimerNow } from "@cyrus/utils/timer";
import { useInterval } from "@mantine/hooks";
import { useRef } from "react";
import { Marker, MarkerContent } from "@/components/ui/marker";

export function WorkingMarker({ startedAt }: { startedAt: string }) {
	const textRef = useRef<HTMLSpanElement>(null);
	const initialText = formatElapsedTimerNow(startedAt);

	useInterval(
		() => {
			if (textRef.current)
				textRef.current.textContent = formatElapsedTimerNow(startedAt);
		},
		1000,
		{ autoInvoke: true }
	);

	return (
		<Marker className="py-0.5 pl-1.5" role="status">
			<span className="sr-only">Agent is working</span>
			<MarkerContent className="shimmer text-[11px] text-muted-foreground/70 tabular-nums">
				Working for{" "}
				<span aria-hidden="true" ref={textRef}>
					{initialText}
				</span>
			</MarkerContent>
		</Marker>
	);
}
