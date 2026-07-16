import "@/global.css";
import { QueryProvider } from "@cyrus/providers/query-provider";
import { initLogger, log } from "evlog";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

initLogger({ env: { service: "cyrus/mobile" } });

export const unstable_settings = {
	initialRouteName: "(drawer)",
};

function StackLayout() {
	return (
		<Stack screenOptions={{}}>
			<Stack.Screen name="(drawer)" options={{ headerShown: false }} />
			<Stack.Screen
				name="modal"
				options={{ title: "Modal", presentation: "modal" }}
			/>
		</Stack>
	);
}

export default function Layout() {
	return (
		<QueryProvider
			onError={(error) => log.error({ kind: "query_error", error })}
		>
			<GestureHandlerRootView className="flex-1">
				<KeyboardProvider>
					<HeroUINativeProvider>
						<StackLayout />
					</HeroUINativeProvider>
				</KeyboardProvider>
			</GestureHandlerRootView>
		</QueryProvider>
	);
}
