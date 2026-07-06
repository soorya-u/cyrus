import { autoAnimate } from "@formkit/auto-animate";
import { useRef } from "react";

const SIDEBAR_LIST_ANIMATION_OPTIONS = {
	duration: 180,
	easing: "ease-out",
} as const;

export function useAutoAnimateRef() {
	const animatedNodesRef = useRef(new WeakSet<HTMLElement>());
	return (node: HTMLElement | null) => {
		if (!node || animatedNodesRef.current.has(node)) {
			return;
		}
		autoAnimate(node, SIDEBAR_LIST_ANIMATION_OPTIONS);
		animatedNodesRef.current.add(node);
	};
}
