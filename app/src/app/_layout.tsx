// Polyfills also load from index.js; this import is a safety net for
// tooling that renders routes without the custom entry.
import "@/polyfills";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { WalletProvider } from "@/lib/wallet";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <WalletProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="claim"
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "Claim a gift",
            headerTitleStyle: { color: colors.text, fontWeight: "600" },
            headerStyle: { backgroundColor: colors.card },
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </WalletProvider>
  );
}
