import { useWorkerConversationSync } from "@cyrus/hooks/connection/use-worker-conversation-sync";
import { RtcProvider } from "@cyrus/providers/rtc/rtc-provider";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { dialRtc } from "@/lib/orpc";

export default function WorkerLayout() {
	const { workerId } = useLocalSearchParams<{ workerId: string }>();

	if (!workerId) {
		return (
			<View className="flex-1 items-center justify-center">
				<Text>Missing worker</Text>
			</View>
		);
	}

	return (
		<RtcProvider
			dialRtc={dialRtc}
			errorFallback={({ error, retry }) => (
				<View className="flex-1 items-center justify-center">
					<Text>Connection failed: {error.message}</Text>
					<Text onPress={retry}>Retry</Text>
				</View>
			)}
			pendingFallback={
				<View className="flex-1 items-center justify-center">
					<Text>Connecting to worker…</Text>
				</View>
			}
			workerId={workerId}
		>
			<WorkerLayoutContent workerId={workerId} />
		</RtcProvider>
	);
}

function WorkerLayoutContent({ workerId }: { workerId: string }) {
	useWorkerConversationSync();

	return (
		<View className="flex-1 p-4">
			<Text>Worker {workerId}</Text>
		</View>
	);
}
