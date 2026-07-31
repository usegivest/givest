import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useURL } from "expo-linking";
import * as Clipboard from "expo-clipboard";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatEther, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "@/lib/chain";
import { CONTRACT_ADDRESS, EXPLORER_URL, stockByAddress, stockDropsAbi } from "@/lib/config";
import { fetchTokenInfo } from "@/lib/tokenInfo";
import { parseClaimLink, type ParsedClaimLink } from "@/lib/links";
import { claimViaRelayer } from "@/lib/relayer";
import { saveReceivedClaim } from "@/lib/storage";
import { useWallet } from "@/lib/wallet";
import { colors } from "@/lib/theme";
import { Card, PillButton, SectionLabel } from "@/components/ui";
import { StockLogo } from "@/components/StockLogo";

type DropInfo = {
  token: Address;
  amountPerClaim: bigint;
  expiresAt: number;
  claimableAt: number;
  maxClaims: number;
  claimsMade: number;
  status: number;
  symbol: string;
  name: string;
};

type ClaimState =
  | { step: "input" }
  | { step: "locked"; to: string | null; url: string }
  | { step: "loading" }
  | {
      step: "ready";
      claimPriv: Hex;
      drop: DropInfo;
      message: string | null;
      fromX: string | null;
    }
  | { step: "claiming"; drop: DropInfo }
  | { step: "success"; drop: DropInfo; txHash: string };

export default function ClaimScreen() {
  const { address } = useWallet();
  const deepLink = useURL();
  const handledDeepLink = useRef<string | null>(null);
  const [input, setInput] = useState("");
  const [state, setState] = useState<ClaimState>({ step: "input" });
  const [error, setError] = useState<string | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const loadLink = useCallback(async (parsed: ParsedClaimLink) => {
    setError(null);
    if (parsed.kind === "invalid") {
      setError("That does not look like a Givest claim link.");
      return;
    }
    if (parsed.kind === "locked") {
      setState({ step: "locked", to: parsed.to, url: parsed.url });
      return;
    }
    setState({ step: "loading" });
    try {
      const claimKeyAddress = privateKeyToAccount(parsed.claimPriv).address;
      const [, token, , amountPerClaim, expiresAt, claimableAt, maxClaims, claimsMade, status] =
        await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: stockDropsAbi,
          functionName: "drops",
          args: [claimKeyAddress],
        });

      if (status === 0) {
        throw new Error("No gift found for this link. Double-check it.");
      }
      if (status !== 1) {
        throw new Error("This gift is no longer active.");
      }
      if (Number(claimsMade) >= Number(maxClaims)) {
        throw new Error("All shares of this gift have been claimed.");
      }
      if (nowSecNow() >= Number(expiresAt)) {
        throw new Error("This gift has expired.");
      }

      const listed = stockByAddress(token);
      let symbol = listed?.symbol ?? null;
      let name = listed?.name ?? null;
      if (!symbol) {
        const info = await fetchTokenInfo(token);
        symbol = info?.symbol ?? "tokens";
        name = info?.name ?? "Unknown token";
      }

      setState({
        step: "ready",
        claimPriv: parsed.claimPriv,
        message: parsed.message,
        fromX: parsed.fromX,
        drop: {
          token,
          amountPerClaim,
          expiresAt: Number(expiresAt),
          claimableAt: Number(claimableAt),
          maxClaims: Number(maxClaims),
          claimsMade: Number(claimsMade),
          status,
          symbol,
          name: name ?? symbol,
        },
      });
    } catch (e) {
      setState({ step: "input" });
      setError(
        e instanceof Error ? e.message.split("\n")[0] : "Could not read this gift.",
      );
    }
  }, []);

  // Deep links (givest://claim#... or pasted universal links).
  useEffect(() => {
    if (!deepLink || handledDeepLink.current === deepLink) return;
    if (!deepLink.includes("#")) return;
    handledDeepLink.current = deepLink;
    setInput(deepLink);
    loadLink(parseClaimLink(deepLink));
  }, [deepLink, loadLink]);

  async function pasteFromClipboard() {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setInput(text);
      loadLink(parseClaimLink(text));
    }
  }

  async function claim() {
    if (state.step !== "ready" || !address) return;
    const { claimPriv, drop } = state;
    setError(null);
    setState({ step: "claiming", drop });
    try {
      const txHash = await claimViaRelayer(claimPriv, address);
      await saveReceivedClaim({
        claimKey: privateKeyToAccount(claimPriv).address,
        symbol: drop.symbol,
        shares: Number(formatEther(drop.amountPerClaim)),
        txHash,
        claimedAt: Date.now(),
      });
      setState({ step: "success", drop, txHash });
    } catch (e) {
      setState({ step: "input" });
      setError(
        e instanceof Error ? e.message.split("\n")[0] : "The claim failed. Try again.",
      );
    }
  }

  const unlockIn =
    state.step === "ready" ? state.drop.claimableAt - nowSec : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {state.step === "input" && (
        <>
          <Text style={styles.lede}>
            Paste a Givest claim link. We cover the network fee - claiming is
            free.
          </Text>
          <Card style={styles.inputCard}>
            <TextInput
              style={styles.linkInput}
              value={input}
              onChangeText={setInput}
              placeholder="https://usegivest.app/claim#0x…"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <PillButton
              title="Paste from clipboard"
              variant="secondary"
              onPress={pasteFromClipboard}
              icon={
                <Ionicons name="clipboard-outline" size={16} color={colors.text} />
              }
            />
            <PillButton
              title="Open gift"
              onPress={() => loadLink(parseClaimLink(input))}
              disabled={!input.trim()}
            />
          </Card>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </>
      )}

      {state.step === "locked" && (
        <Card style={styles.centerCard}>
          <Ionicons name="lock-closed-outline" size={30} color={colors.text} />
          <Text style={styles.cardTitle}>
            {state.to
              ? `This gift is locked to @${state.to}`
              : "This gift is locked to an X handle"}
          </Text>
          <Text style={styles.cardBody}>
            Locked drops are verified with an X post, so they can only be
            claimed on the web.
          </Text>
          <PillButton
            title="Claim on the web"
            onPress={() => Linking.openURL(state.url)}
          />
          <PillButton
            title="Back"
            variant="ghost"
            onPress={() => setState({ step: "input" })}
          />
        </Card>
      )}

      {(state.step === "loading" || state.step === "claiming") && (
        <Card style={styles.centerCard}>
          <PillButton title="" loading onPress={() => {}} variant="ghost" />
          <Text style={styles.cardBody}>
            {state.step === "loading"
              ? "Reading the gift onchain…"
              : "Claiming your gift… the relayer pays the gas."}
          </Text>
        </Card>
      )}

      {state.step === "ready" && (
        <>
          <Card style={styles.giftCard}>
            <View style={styles.giftHeader}>
              <StockLogo symbol={state.drop.symbol} size={44} />
              <View style={styles.giftHeadText}>
                <Text style={styles.giftShares}>
                  {Number(formatEther(state.drop.amountPerClaim)).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 4 },
                  )}{" "}
                  {state.drop.symbol}
                </Text>
                <Text style={styles.giftName}>{state.drop.name}</Text>
              </View>
            </View>

            {state.fromX && (
              <Text style={styles.giftFrom}>From @{state.fromX}</Text>
            )}
            {state.message && (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>“{state.message}”</Text>
              </View>
            )}

            {state.drop.maxClaims > 1 && (
              <Text style={styles.giftMeta}>
                {state.drop.maxClaims - state.drop.claimsMade} of{" "}
                {state.drop.maxClaims} shares left
              </Text>
            )}

            {unlockIn > 0 ? (
              <View style={styles.countdownBox}>
                <Ionicons name="time-outline" size={16} color={colors.secondary} />
                <Text style={styles.countdownText}>
                  Opens in {formatCountdown(unlockIn)}
                </Text>
              </View>
            ) : (
              <PillButton title="Claim to my wallet" onPress={claim} />
            )}
            <Text style={styles.gasNote}>
              Zero gas - Givest pays the network fee.
            </Text>
          </Card>
          <PillButton
            title="Use a different link"
            variant="ghost"
            onPress={() => setState({ step: "input" })}
          />
        </>
      )}

      {state.step === "success" && (
        <Card style={styles.centerCard}>
          <SuccessCheck />
          <Text style={styles.cardTitle}>
            {Number(formatEther(state.drop.amountPerClaim)).toLocaleString(
              undefined,
              { maximumFractionDigits: 4 },
            )}{" "}
            {state.drop.symbol} is yours
          </Text>
          <Text style={styles.cardBody}>
            The tokens landed in your Givest wallet. Check Home to see your
            balance.
          </Text>
          <Pressable
            onPress={() =>
              state.step === "success" &&
              Linking.openURL(`${EXPLORER_URL}/tx/${state.txHash}`)
            }
          >
            <Text style={styles.txLink}>View transaction on Blockscout</Text>
          </Pressable>
        </Card>
      )}
    </ScrollView>
  );
}

function nowSecNow() {
  return Math.floor(Date.now() / 1000);
}

function formatCountdown(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/** Simple animated checkmark - a light confetti-free flourish. */
function SuccessCheck() {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scale]);
  return (
    <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
      <Ionicons name="checkmark" size={34} color="#fff" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 48, gap: 14 },
  lede: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondary,
    paddingTop: 6,
  },
  inputCard: { gap: 12 },
  linkInput: {
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    padding: 13,
    overflow: "hidden",
  },
  centerCard: { alignItems: "center", gap: 12, paddingVertical: 30 },
  cardTitle: {
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.text,
    textAlign: "center",
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondary,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  giftCard: { gap: 14 },
  giftHeader: { flexDirection: "row", alignItems: "center", gap: 13 },
  giftHeadText: { gap: 2 },
  giftShares: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.text,
  },
  giftName: { fontSize: 13, color: colors.secondary },
  giftFrom: { fontSize: 13, fontWeight: "600", color: colors.secondary },
  messageBox: {
    borderRadius: 14,
    backgroundColor: colors.bg,
    padding: 13,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
    color: colors.text,
  },
  giftMeta: { fontSize: 12, color: colors.faint },
  countdownBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
  },
  countdownText: { fontSize: 14, fontWeight: "600", color: colors.secondary },
  gasNote: { textAlign: "center", fontSize: 11, color: colors.faint },
  txLink: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondary,
    paddingVertical: 4,
  },
  successCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
});
