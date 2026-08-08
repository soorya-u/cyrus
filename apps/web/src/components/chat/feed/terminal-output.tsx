// Trimmed from magicui's Terminal (https://magicui.design/docs/components/terminal):
// only the sequencing engine and AnimatedSpan/TerminalOutput are used by
// ShellExecutionRow. The bordered/mac-dots Terminal chrome and TypingAnimation
// aren't needed here — ShellExecutionRow supplies its own header.
import { cn } from "cnfast";
import { type MotionProps, motion, useInView } from "motion/react";
import {
	Children,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

type SequenceContextValue = {
	activeIndex: number;
	completeItem: (index: number) => void;
	sequenceStarted: boolean;
};

const SequenceContext = createContext<SequenceContextValue | null>(null);

const useSequence = () => useContext(SequenceContext);

const ItemIndexContext = createContext<number | null>(null);
const useItemIndex = () => useContext(ItemIndexContext);

interface AnimatedSpanProps extends MotionProps {
	children: React.ReactNode;
	className?: string;
	delay?: number;
	startOnView?: boolean;
}

export const AnimatedSpan = ({
	children,
	delay = 0,
	className,
	startOnView = false,
	...props
}: AnimatedSpanProps) => {
	const elementRef = useRef<HTMLDivElement | null>(null);
	const isInView = useInView(elementRef as React.RefObject<Element>, {
		amount: 0.3,
		once: true,
	});

	const sequence = useSequence();
	const itemIndex = useItemIndex();
	const [hasStarted, setHasStarted] = useState(false);
	useEffect(() => {
		if (!sequence || itemIndex === null) return;
		if (!sequence.sequenceStarted) return;
		if (hasStarted) return;
		if (sequence.activeIndex === itemIndex) {
			setHasStarted(true);
		}
	}, [sequence, hasStarted, itemIndex]);

	let shouldAnimate = true;
	if (sequence) {
		shouldAnimate = hasStarted;
	} else if (startOnView) {
		shouldAnimate = isInView;
	}

	return (
		<motion.div
			animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: -5 }}
			className={cn("grid font-normal text-sm tracking-tight", className)}
			initial={{ opacity: 0, y: -5 }}
			onAnimationComplete={() => {
				if (!sequence) return;
				if (itemIndex === null) return;
				sequence.completeItem(itemIndex);
			}}
			ref={elementRef}
			transition={{ duration: 0.3, delay: sequence ? 0 : delay / 1000 }}
			{...props}
		>
			{children}
		</motion.div>
	);
};

type TerminalOutputProps = {
	children: React.ReactNode;
	className?: string;
	sequence?: boolean;
	startOnView?: boolean;
};

/**
 * Headless sequencing engine + `<pre><code>` output: no bordered card or
 * mac-dots header, for custom chrome that wants the AnimatedSpan choreography
 * without magicui's default Terminal frame.
 */
export const TerminalOutput = ({
	children,
	className,
	sequence = true,
	startOnView = true,
}: TerminalOutputProps) => {
	const containerRef = useRef<HTMLPreElement | null>(null);
	const isInView = useInView(containerRef as React.RefObject<Element>, {
		amount: 0.3,
		once: true,
	});

	const [activeIndex, setActiveIndex] = useState(0);
	const sequenceHasStarted = sequence ? !startOnView || isInView : false;

	const contextValue = useMemo<SequenceContextValue | null>(() => {
		if (!sequence) return null;
		return {
			completeItem: (index: number) => {
				setActiveIndex((current) =>
					index === current ? current + 1 : current
				);
			},
			activeIndex,
			sequenceStarted: sequenceHasStarted,
		};
	}, [sequence, activeIndex, sequenceHasStarted]);

	const wrappedChildren = useMemo(() => {
		if (!sequence) return children;
		const array = Children.toArray(children);
		return array.map((child, index) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: arbitrary JSX children have no natural id; position is stable
			<ItemIndexContext.Provider key={index} value={index}>
				{child as React.ReactNode}
			</ItemIndexContext.Provider>
		));
	}, [children, sequence]);

	const content = (
		<pre className={cn("p-4", className)} ref={containerRef}>
			<code className="grid gap-y-1 overflow-auto">{wrappedChildren}</code>
		</pre>
	);

	if (!sequence) return content;

	return (
		<SequenceContext.Provider value={contextValue}>
			{content}
		</SequenceContext.Provider>
	);
};
