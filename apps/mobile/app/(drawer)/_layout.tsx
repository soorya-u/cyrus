import { SignalingProvider } from "@cyrus/providers/signaling/signaling-provider";
import { Slot } from "expo-router";
import { Text, View } from "react-native";
import { authClient } from "@/lib/auth";
import { dialSignaling } from "@/lib/orpc";

export default function DrawerLayout() {
	const { data: session } = authClient.useSession();
	const userId = session?.user.id ?? "pending";

	return (
		<SignalingProvider
			dialSignaling={dialSignaling}
			errorFallback={({ error, retry }) => (
				<View
					style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
				>
					<Text>Connection failed: {error.message}</Text>
					<Text onPress={retry}>Retry</Text>
				</View>
			)}
			pendingFallback={
				<View
					style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
				>
					<Text>Connecting…</Text>
				</View>
			}
			queryKey={["signaling", userId]}
		>
			<Slot />
		</SignalingProvider>
	);
}
