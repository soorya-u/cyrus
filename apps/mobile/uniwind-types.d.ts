import type { ClassNameValue } from "uniwind";

declare module "react-native" {
	type ViewProps = {
		className?: ClassNameValue;
	};
	type TextProps = {
		className?: ClassNameValue;
	};
	type PressableProps = {
		className?: ClassNameValue;
	};
	type TextInputProps = {
		className?: ClassNameValue;
	};
	type ScrollViewProps = {
		className?: ClassNameValue;
	};
	type ImageProps = {
		className?: ClassNameValue;
	};
	type FlatListProps<ItemT> = {
		className?: ClassNameValue;
	};
	type ActivityIndicatorProps = {
		className?: ClassNameValue;
	};
	type SwitchProps = {
		className?: ClassNameValue;
	};
	type ModalBaseProps = {
		className?: ClassNameValue;
	};
}

declare module "react-native/Libraries/Animated/createAnimatedComponent" {
	type AnimatedComponent<P> = {
		className?: ClassNameValue;
	};
}
