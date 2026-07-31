import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import QRCode from "react-native-qrcode-svg";
import { formatEther, type Hex } from "viem";
import { publicClient } from "@/lib/chain";
import { readFeeStatus, type FeeStatus } from "@/lib/fees";
import { supabase } from "@/lib/supabase";
import { useWallet } from "@/lib/wallet";
import { colors, formatUsd, shortAddress } from "@/lib/theme";
import { readEthUsd } from "@/lib/prices";
import { Card, PillButton, SectionLabel } from "@/components/ui";

const LINKS = [
  { label: "usegivest.app", url: "https://usegivest.app" },
  { label: "X · @usegivest", url: "https://x.com/usegivest" },
  { label: "GitHub · usegivest/givest", url: "https://github.com/usegivest/givest" },
];

export default function ProfileScreen() {
  const { address, revealPrivateKey } = useWallet();
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [fee, setFee] = useState<FeeStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealedKey, setRevealedKey] = useState<Hex | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [otpState, setOtpState] = useState<"idle" | "sending" | "sent">("idle");

  const load = useCallback(async () => {
    if (!address) return;
    const [balance, price, feeStatus] = await Promise.all([
      publicClient.getBalance({ address }).catch(() => null),
      readEthUsd(),
      readFeeStatus(address),
    ]);
    setEthBalance(balance);
    setEthUsd(price);
    setFee(feeStatus);
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  // Balance goes stale fast - refresh every time the tab is opened.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function copyAddress() {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function backupWallet() {
    Alert.alert(
      "Reveal private key?",
      "Anyone with this key controls your funds. Only do this in private, and never share it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reveal key",
          style: "destructive",
          onPress: async () => {
            const key = await revealPrivateKey();
            if (key) setRevealedKey(key);
          },
        },
      ],
    );
  }

  async function copyKey() {
    if (!revealedKey) return;
    await Clipboard.setStringAsync(revealedKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1600);
  }

  async function sendOtp() {
    if (!supabase || !email.trim()) return;
    setOtpState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });
    if (error) {
      Alert.alert("Sign in failed", error.message);
      setOtpState("idle");
    } else {
      setOtpState("sent");
    }
  }

  const ethNum = ethBalance !== null ? Number(formatEther(ethBalance)) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Profile</Text>

        <Card style={styles.walletCard}>
          <SectionLabel>Your wallet</SectionLabel>
          {address && (
            <>
              <View style={styles.qrWrap}>
                <QRCode value={address} size={140} color={colors.text} />
              </View>
              <Pressable onPress={copyAddress} style={styles.addressRow}>
                <Text style={styles.addressText}>{shortAddress(address)}</Text>
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={15}
                  color={copied ? colors.success : colors.secondary}
                />
              </Pressable>
            </>
          )}
          <Text style={styles.balanceText}>
            {ethNum !== null ? `${ethNum.toFixed(5)} ETH` : "—"}
            {ethNum !== null && ethUsd !== null && (
              <Text style={styles.balanceUsd}>
                {"  "}
                {formatUsd(ethNum * ethUsd)}
              </Text>
            )}
          </Text>
          <Text style={styles.fundHint}>
            Fund by sending ETH on Robinhood Chain to this address.
          </Text>
        </Card>

        <Card style={styles.backupCard}>
          <View style={styles.rowBetween}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Back up wallet</Text>
              <Text style={styles.rowSub}>
                Your key lives only on this device. Save it somewhere safe.
              </Text>
            </View>
            <PillButton
              title="Back up"
              variant="secondary"
              onPress={backupWallet}
              style={styles.smallButton}
            />
          </View>
          {revealedKey && (
            <View style={styles.keyBox}>
              <Text style={styles.keyText} selectable>
                {revealedKey}
              </Text>
              <View style={styles.keyActions}>
                <PillButton
                  title={keyCopied ? "Copied" : "Copy key"}
                  variant="secondary"
                  onPress={copyKey}
                  style={styles.smallButton}
                />
                <PillButton
                  title="Hide"
                  variant="ghost"
                  onPress={() => setRevealedKey(null)}
                  style={styles.smallButton}
                />
              </View>
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.rowTitle}>Sign in</Text>
          {supabase ? (
            otpState === "sent" ? (
              <Text style={styles.rowSub}>
                Check your inbox - we sent a sign-in link to {email.trim()}.
              </Text>
            ) : (
              <>
                <Text style={styles.rowSub}>
                  Sync your gift history across devices with an email link.
                </Text>
                <TextInput
                  style={styles.emailInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.faint}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
                <PillButton
                  title="Send sign-in link"
                  onPress={sendOtp}
                  loading={otpState === "sending"}
                  disabled={!email.trim()}
                />
              </>
            )
          ) : (
            <Text style={styles.rowSub}>
              Coming soon - account sync is not enabled in this build.
            </Text>
          )}
        </Card>

        <Card style={styles.listCard}>
          {LINKS.map((link) => (
            <Pressable
              key={link.url}
              onPress={() => Linking.openURL(link.url)}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>{link.label}</Text>
              <Ionicons name="open-outline" size={15} color={colors.faint} />
            </Pressable>
          ))}
          <View style={styles.linkRow}>
            <Text style={styles.metaText}>Fees</Text>
            <Text style={styles.metaValue}>
              {fee ? fee.label : "…"}
            </Text>
          </View>
          <View style={[styles.linkRow, styles.lastRow]}>
            <Text style={styles.metaText}>Version</Text>
            <Text style={styles.metaValue}>
              {Constants.expoConfig?.version ?? "1.0.0"}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 40, gap: 14 },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.text,
    paddingTop: 10,
  },
  walletCard: { alignItems: "center", gap: 12 },
  qrWrap: {
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.hairline,
  },
  addressText: { fontSize: 13, fontFamily: "Menlo", color: colors.text },
  balanceText: { fontSize: 18, fontWeight: "700", color: colors.text },
  balanceUsd: { fontSize: 14, fontWeight: "400", color: colors.secondary },
  fundHint: { fontSize: 12, color: colors.faint, textAlign: "center" },
  backupCard: { gap: 12 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowTextWrap: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 12, lineHeight: 17, color: colors.secondary, marginTop: 3 },
  smallButton: { paddingVertical: 10, paddingHorizontal: 16 },
  keyBox: {
    borderRadius: 14,
    backgroundColor: colors.bg,
    padding: 13,
    gap: 10,
  },
  keyText: { fontSize: 12, fontFamily: "Menlo", color: colors.text },
  keyActions: { flexDirection: "row", gap: 8 },
  emailInput: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  listCard: { paddingVertical: 4 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  lastRow: { borderBottomWidth: 0 },
  linkText: { fontSize: 14, fontWeight: "600", color: colors.text },
  metaText: { fontSize: 14, color: colors.secondary },
  metaValue: { fontSize: 13, color: colors.faint },
});
