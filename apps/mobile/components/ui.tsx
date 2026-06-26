import type React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";

type ButtonProps = {
	children: React.ReactNode;
	onPress?: () => void;
	style?: ViewStyle;
	variant?: "default" | "outline" | "ghost";
};

export function Button({
	children,
	onPress,
	variant = "default",
	style,
}: ButtonProps) {
	const base: ViewStyle = {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	};
	const variants: Record<string, ViewStyle> = {
		default: { backgroundColor: "#262626" },
		outline: { borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
		ghost: {},
	};
	return (
		<Pressable onPress={onPress} style={[base, variants[variant], style]}>
			<Text
				style={{
					color: variant === "default" ? "#fff" : "#262626",
					fontWeight: "600",
				}}
			>
				{children}
			</Text>
		</Pressable>
	);
}

type InputProps = {
	onChangeText: (t: string) => void;
	placeholder?: string;
	style?: ViewStyle;
	value: string;
};

export function Input({ value, onChangeText, placeholder, style }: InputProps) {
	return (
		<View
			style={[
				{
					borderWidth: 1,
					borderColor: "rgba(0,0,0,0.1)",
					borderRadius: 10,
					paddingHorizontal: 12,
					paddingVertical: 8,
					backgroundColor: "#fff",
				},
				style,
			]}
		>
			{/* Simple text input via native for simplicity; use RN TextInput */}
			{/* We use a controlled TextInput - import inline to avoid RN issues */}
			{/* @ts-ignore */}
			<TextInputLike
				onChangeText={onChangeText}
				placeholder={placeholder}
				value={value}
			/>
		</View>
	);
}

type TextInputLikeProps = {
	onChangeText: (text: string) => void;
	placeholder?: string;
	value: string;
};

// Minimal TextInput poly to avoid import issues in this isolated file
function TextInputLike({
	value,
	onChangeText,
	placeholder,
}: TextInputLikeProps) {
	const RN = require("react-native");
	const TI = RN.TextInput;
	return (
		<TI
			onChangeText={onChangeText}
			placeholder={placeholder}
			style={{ fontSize: 15, padding: 0 }}
			value={value}
		/>
	);
}
