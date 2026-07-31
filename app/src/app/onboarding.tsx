import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GivestMark } from "@/components/GivestMark";
import { AccentDot, PillButton } from "@/components/ui";
import { useWallet } from "@/lib/wallet";
import { colors } from "@/lib/theme";

const VALUE_PROPS = [
  {
    title: "Send stocks as links",
    body: "Pick a stock and an amount. Share one private link.",
  },
  {
    title: "Claim with zero gas",
    body: "Recipients claim for free. Givest covers the network fee.",
  },
  {
    title: "Schedule gifts to the future",
    body: "Seal a gift until a birthday. The date is enforced onchain.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { createWallet } = useWallet();
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      await createWallet();
      router.replace("/(tabs)");
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Please try again.";
      Alert.alert("Could not create your wallet", detail);
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={[colors.bgWash, "#fff7fa", colors.bg]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.markWrap}>
            <GivestMark size={64} />
            <View style={styles.markDot}>
              <AccentDot size={8} />
            </View>
          </View>
          <Text style={styles.title}>Givest</Text>
          <Text style={styles.subtitle}>
            The easiest way to send and receive real stock gifts.
          </Text>
        </View>

        <View style={styles.props}>
          {VALUE_PROPS.map((p) => (
            <View key={p.title} style={styles.propRow}>
              <View style={styles.propDot}>
                <AccentDot size={7} />
              </View>
              <View style={styles.propText}>
                <Text style={styles.propTitle}>{p.title}</Text>
                <Text style={styles.propBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <PillButton
            title="Create my wallet"
            onPress={handleCreate}
            loading={creating}
          />
          <Text style={styles.smallPrint}>Your key never leaves this device.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 12,
  },
  hero: {
    flex: 1.1,
    justifyContent: "flex-end",
    gap: 14,
    paddingBottom: 36,
  },
  markWrap: {
    width: 72,
    height: 72,
    justifyContent: "center",
  },
  markDot: {
    position: "absolute",
    right: -2,
    bottom: 4,
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1.2,
    color: colors.text,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 25,
    color: colors.secondary,
    maxWidth: 300,
  },
  props: {
    gap: 22,
    paddingBottom: 36,
  },
  propRow: {
    flexDirection: "row",
    gap: 14,
  },
  propDot: {
    paddingTop: 6,
  },
  propText: {
    flex: 1,
    gap: 3,
  },
  propTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  propBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondary,
  },
  footer: {
    gap: 14,
    paddingBottom: 8,
  },
  smallPrint: {
    textAlign: "center",
    fontSize: 12,
    color: colors.faint,
  },
});
