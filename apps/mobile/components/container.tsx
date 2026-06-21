import { View } from "react-native";
export default function Container({ children }: { children: React.ReactNode }) {
	return <View style={{ flex: 1, padding: 16 }}>{children}</View>;
}
