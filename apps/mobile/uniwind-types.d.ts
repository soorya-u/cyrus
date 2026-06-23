import type { ClassNameValue } from "uniwind";

declare module "react-native" {
	interface ViewProps {
		className?: ClassNameValue;
	}
	interface TextProps {
		className?: ClassNameValue;
	}
	interface PressableProps {
		className?: ClassNameValue;
	}
	interface TextInputProps {
		className?: ClassNameValue;
	}
	interface ScrollViewProps {
		className?: ClassNameValue;
	}
	interface ImageProps {
		className?: ClassNameValue;
	}
	interface FlatListProps<ItemT> {
		className?: ClassNameValue;
	}
	interface ActivityIndicatorProps {
		className?: ClassNameValue;
	}
	interface SwitchProps {
		className?: ClassNameValue;
	}
	interface ModalBaseProps {
		className?: ClassNameValue;
	}
}

declare module "react-native/Libraries/Animated/createAnimatedComponent" {
	interface AnimatedComponent<P> {
		className?: ClassNameValue;
	}
}
