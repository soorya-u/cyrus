import { memo, useCallback, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { AppText as Text } from "./app-text";

type ThreadComposerProps = {
	busy: boolean;
	onChange: (text: string) => void;
	onSend: () => void;
	onStop?: () => void;
	placeholder?: string;
	value: string;
};

export const ThreadComposer = memo(function ThreadComposer({
	value,
	onChange,
	onSend,
	onStop,
	busy,
	placeholder = "Ask the repo agent, or run a command…",
}: ThreadComposerProps) {
	const inputRef = useRef<TextInput | null>(null);
	const [focused, setFocused] = useState(false);

	const handleSend = useCallback(() => {
		if (!value.trim()) {
			return;
		}
		onSend();
	}, [onSend, value]);

	return (
		<View
			className="px-4 pt-1.5"
			style={{
				paddingBottom: 6,
			}}
		>
			<View className="w-full" style={{ position: "relative" }}>
				<View
					className="w-full overflow-hidden border border-border bg-card"
					style={
						focused
							? { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12 }
							: {
									borderRadius: 999,
									flexDirection: "row",
									alignItems: "center",
									paddingLeft: 18,
									paddingRight: 5,
									paddingVertical: 5,
								}
					}
				>
					<View style={focused ? undefined : { flex: 1, minWidth: 0 }}>
						<TextInput
							multiline={focused}
							onBlur={() => setFocused(false)}
							onChangeText={onChange}
							onFocus={() => setFocused(true)}
							placeholder={placeholder}
							placeholderTextColor="#a3a3a3"
							ref={inputRef}
							style={{
								color: "#262626",
								fontSize: 15,
								fontFamily: "system",
								...(focused
									? {
											minHeight: 80,
											maxHeight: 160,
											paddingHorizontal: 4,
											paddingVertical: 4,
										}
									: { height: 36 }),
							}}
							value={value}
						/>
					</View>
					{!focused &&
						(busy ? (
							<ControlPill
								icon="⏹"
								onPress={() => onStop?.()}
								variant="danger"
							/>
						) : (
							<ControlPill
								disabled={!value.trim()}
								icon="↑"
								onPress={handleSend}
								variant="primary"
							/>
						))}
				</View>

				{focused ? (
					<View className="flex-row items-center gap-2 pt-2">
						<ControlPill
							icon="+"
							label="Attach"
							onPress={() => {
								/* noop */
							}}
							variant="ghost"
						/>
						<View className="flex-1" />
						{busy ? (
							<ControlPill
								icon="⏹"
								label="Stop"
								onPress={() => onStop?.()}
								variant="danger"
							/>
						) : (
							<ControlPill
								disabled={!value.trim()}
								icon="↑"
								label="Send"
								onPress={handleSend}
								variant="primary"
							/>
						)}
					</View>
				) : null}
			</View>
		</View>
	);
});

type ControlPillProps = {
	disabled?: boolean;
	icon: string;
	label?: string;
	onPress: () => void;
	variant: "primary" | "danger" | "ghost";
};

function ControlPill({
	icon,
	label,
	variant,
	disabled,
	onPress,
}: ControlPillProps) {
	let bg: string;
	if (variant === "primary") {
		bg = "bg-primary";
	} else if (variant === "danger") {
		bg = "bg-red-500";
	} else {
		bg = "bg-black/5 dark:bg-white/10";
	}
	const fg = variant === "ghost" ? "text-foreground" : "text-white";
	return (
		<Pressable
			className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${bg} ${disabled ? "opacity-40" : "active:opacity-70"}`}
			disabled={disabled}
			onPress={onPress}
		>
			<Text className={`font-bold text-sm ${fg}`}>{icon}</Text>
			{label ? (
				<Text className={`font-bold text-sm ${fg}`}>{label}</Text>
			) : null}
		</Pressable>
	);
}
