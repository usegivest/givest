import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import Ionicons from "@expo/vector-icons/Ionicons";
import QRCode from "react-native-qrcode-svg";
import { formatEther } from "viem";
import { publicClient } from "@/lib/chain";
import { STOCKS, erc20Abi, type Stock } from "@/lib/config";
import { readEthUsd, readUsdPrice } from "@/lib/prices";
import { useWallet } from "@/lib/wallet";
import { colors, formatUsd, shortAddress } from "@/lib/theme";
import { AccentDot, Card, PillButton, SectionLabel } from "@/components/ui";
import { StockLogo } from "@/components/StockLogo";
import { GivestMark } from "@/components/GivestMark";

type Holding = {
  stock: Stock;
  balance: bigint;
  usdPrice: number | null;
};

export default function HomeScreen() {
  const router = useRouter();
  const { address } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [fundOpen, setFundOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    const [eth, ethPrice, stockResults] = await Promise.all([
      publicClient.getBalance({ address }).catch(() => null),
      readEthUsd(),
      Promise.all(
        STOCKS.map(async (stock): Promise<Holding | null> => {
          try {
            const balance = await publicClient.readContract({
              address: stock.address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            });
            if (balance === 0n) return null;
            const usdPrice = stock.feed
              ? await readUsdPrice(stock.feed)
              : null;
            return { stock, balance, usdPrice };
          } catch {
            return null;
          }
        }),
      ),
    ]);
    setEthBalance(eth);
    setEthUsd(ethPrice);
    setHoldings(stockResults.filter((h): h is Holding => h !== null));
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh whenever the tab regains focus and poll while it is visible,
  // so a freshly funded wallet shows up without a manual pull. Polling
  // pauses while the app is backgrounded (no wasted RPC calls or battery)
  // and refreshes immediately when it comes back to the foreground.
  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(() => {
        if (AppState.currentState === "active") load();
      }, 8000);
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") load();
      });
      return () => {
        clearInterval(id);
        sub.remove();
      };
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function copyAddress() {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const ethNum = ethBalance !== null ? Number(formatEther(ethBalance)) : null;
  const ethUsdValue =
    ethNum !== null && ethUsd !== null ? ethNum * ethUsd : null;
  const stocksUsdValue = holdings.reduce(
    (sum, h) =>
      h.usdPrice !== null
        ? sum + Number(formatEther(h.balance)) * h.usdPrice
        : sum,
    0,
  );
  const totalUsd =
    ethUsdValue !== null ? ethUsdValue + stocksUsdValue : stocksUsdValue;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <LinearGradient
        colors={[colors.bgWash, colors.bg, colors.bg]}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <GivestMark size={22} />
            <Text style={styles.brand}>Givest</Text>
            <AccentDot size={5} />
          </View>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>Welcome back</Text>
          </View>
          <Text style={styles.portfolioValue}>
            {ethBalance === null && holdings.length === 0
              ? "—"
              : formatUsd(totalUsd)}
          </Text>
          <Text style={styles.portfolioLabel}>Total portfolio value</Text>
        </View>

        <View style={styles.actionsRow}>
          <PillButton
            title="Send a gift"
            onPress={() => router.push("/(tabs)/send")}
            icon={
              <Ionicons name="paper-plane-outline" size={17} color={colors.pillText} />
            }
            style={styles.actionButton}
          />
          <PillButton
            title="Claim a gift"
            variant="secondary"
            onPress={() => router.push("/claim")}
            icon={<Ionicons name="gift-outline" size={17} color={colors.text} />}
            style={styles.actionButton}
          />
        </View>

        <Card style={styles.ethCard}>
          <View style={styles.ethRow}>
            <View style={styles.ethLeftRow}>
              <StockLogo symbol="ETH" size={40} />
              <View style={styles.ethLeft}>
                <SectionLabel>ETH balance</SectionLabel>
                <Text style={styles.ethAmount}>
                  {ethNum !== null ? `${ethNum.toFixed(5)} ETH` : "—"}
                </Text>
                {ethUsdValue !== null && (
                  <Text style={styles.ethUsd}>{formatUsd(ethUsdValue)}</Text>
                )}
              </View>
            </View>
            <PillButton
              title={fundOpen ? "Hide" : "Fund"}
              variant="secondary"
              onPress={() => setFundOpen((v) => !v)}
              style={styles.fundButton}
            />
          </View>

          {fundOpen && address && (
            <View style={styles.fundPanel}>
              <Text style={styles.fundHint}>
                Fund your wallet by sending ETH on Robinhood Chain to this
                address. Sends are paid from this balance.
              </Text>
              <View style={styles.qrWrap}>
                <QRCode value={address} size={132} color={colors.text} />
              </View>
              <Pressable onPress={copyAddress} style={styles.addressRow}>
                <Text style={styles.addressText}>{shortAddress(address)}</Text>
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={15}
                  color={copied ? colors.success : colors.secondary}
                />
                <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
              </Pressable>
            </View>
          )}
        </Card>

        <SectionLabel style={styles.holdingsLabel}>Holdings</SectionLabel>
        <Card style={styles.holdingsCard}>
          <HoldingRow
            symbol="ETH"
            name="Ether · Robinhood Chain"
            amount={ethNum !== null ? `${ethNum.toFixed(5)}` : "—"}
            usd={ethUsdValue}
            logo={<StockLogo symbol="ETH" size={34} />}
          />
          {holdings.map((h) => {
            const amount = Number(formatEther(h.balance));
            return (
              <HoldingRow
                key={h.stock.symbol}
                symbol={h.stock.symbol}
                name={h.stock.name}
                amount={amount.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
                usd={h.usdPrice !== null ? amount * h.usdPrice : null}
                logo={<StockLogo symbol={h.stock.symbol} size={34} />}
              />
            );
          })}
          {holdings.length === 0 && (
            <View style={styles.emptyHoldings}>
              <View style={styles.emptyIcon}>
                <Ionicons name="gift-outline" size={20} color={colors.accentDeep} />
              </View>
              <Text style={styles.emptyTitle}>No stock tokens yet</Text>
              <Text style={styles.emptyBody}>
                Claim a gift link from a friend, or send your first gift and
                watch it land here.
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function HoldingRow({
  symbol,
  name,
  amount,
  usd,
  logo,
}: {
  symbol: string;
  name: string;
  amount: string;
  usd: number | null;
  logo: React.ReactNode;
}) {
  return (
    <View style={styles.holdingRow}>
      {logo}
      <View style={styles.holdingText}>
        <Text style={styles.holdingSymbol}>{symbol}</Text>
        <Text style={styles.holdingName} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.holdingRight}>
        <Text style={styles.holdingAmount}>{amount}</Text>
        <Text style={styles.holdingUsd}>
          {usd !== null ? formatUsd(usd) : "–"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 40, gap: 14 },
  header: { paddingTop: 8, paddingBottom: 4, gap: 6 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  brand: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: colors.text,
  },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  greeting: { fontSize: 14, fontWeight: "600", color: colors.secondary },
  portfolioValue: {
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -1.5,
    color: colors.text,
  },
  portfolioLabel: { fontSize: 13, color: colors.faint },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 2 },
  actionButton: { flex: 1 },
  ethCard: { gap: 0 },
  ethRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ethLeftRow: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  ethLeft: { gap: 3, flex: 1 },
  ethAmount: { fontSize: 20, fontWeight: "700", color: colors.text },
  ethUsd: { fontSize: 13, color: colors.secondary },
  fundButton: { paddingVertical: 10, paddingHorizontal: 20 },
  fundPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    alignItems: "center",
    gap: 14,
  },
  fundHint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondary,
    textAlign: "center",
  },
  qrWrap: {
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  addressText: {
    fontSize: 13,
    fontFamily: "Menlo",
    color: colors.text,
  },
  copyText: { fontSize: 12, fontWeight: "600", color: colors.accentDeep },
  holdingsLabel: { marginTop: 8, marginLeft: 4 },
  holdingsCard: { paddingVertical: 6 },
  holdingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  holdingText: { flex: 1, gap: 1 },
  holdingSymbol: { fontSize: 15, fontWeight: "600", color: colors.text },
  holdingName: { fontSize: 12, color: colors.faint },
  holdingRight: { alignItems: "flex-end", gap: 1 },
  holdingAmount: { fontSize: 15, fontWeight: "600", color: colors.text },
  holdingUsd: { fontSize: 12, color: colors.faint },
  emptyHoldings: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 22,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  emptyBody: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.faint,
    textAlign: "center",
  },
});
