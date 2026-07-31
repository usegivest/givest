import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useWallet } from "@/lib/wallet";
import { colors } from "@/lib/theme";

export default function Index() {
  const wallet = useWallet();

  if (wallet.status === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  }

  return wallet.status === "ready" ? (
    <Redirect href="/(tabs)" />
  ) : (
    <Redirect href="/onboarding" />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
