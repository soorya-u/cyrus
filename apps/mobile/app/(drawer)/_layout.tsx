import { SignalingProvider } from "@cyrus/providers/signaling/signaling-provider";
import { Slot } from "expo-router";
import { Text, View } from "react-native";
import { authClient } from "@/lib/auth";
import { dialSignaling } from "@/lib/orpc";

export default function DrawerLayout() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending || !session?.user) {
		return (
			<View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
				<Text>Loading…</Text>
			</View>
		);
	}

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
			queryKey={["signaling", session.user.id]}
		>
			<Slot />
		</SignalingProvider>
	);
}
