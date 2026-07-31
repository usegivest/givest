import React, { useCallback, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import Ionicons from "@expo/vector-icons/Ionicons";
import { publicClient } from "@/lib/chain";
import { CONTRACT_ADDRESS, EXPLORER_URL, stockDropsAbi } from "@/lib/config";
import {
  loadReceivedClaims,
  loadSentDrops,
  type ReceivedClaim,
  type SentDrop,
} from "@/lib/storage";
import { colors, formatUsd } from "@/lib/theme";
import { Card, SectionLabel } from "@/components/ui";
import { StockLogo } from "@/components/StockLogo";

type DropStatus =
  | { kind: "unknown" }
  | { kind: "active"; claimsMade: number; maxClaims: number }
  | { kind: "claimed"; claimsMade: number; maxClaims: number }
  | { kind: "expired" }
  | { kind: "refunded" };

export default function ActivityScreen() {
  const [sent, setSent] = useState<SentDrop[]>([]);
  const [received, setReceived] = useState<ReceivedClaim[]>([]);
  const [statuses, setStatuses] = useState<Record<string, DropStatus>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadLocal = useCallback(async () => {
    const [s, r] = await Promise.all([loadSentDrops(), loadReceivedClaims()]);
    setSent(s);
    setReceived(r);
    return s;
  }, []);

  const refreshStatuses = useCallback(async (drops: SentDrop[]) => {
    const nowSec = Math.floor(Date.now() / 1000);
    const entries = await Promise.all(
      drops.map(async (drop): Promise<[string, DropStatus]> => {
        try {
          const [, , , , expiresAt, , maxClaims, claimsMade, status] =
            await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: stockDropsAbi,
              functionName: "drops",
              args: [drop.claimKey],
            });
          if (status === 2 || Number(claimsMade) >= Number(maxClaims)) {
            return [
              drop.claimKey,
              {
                kind: "claimed",
                claimsMade: Number(claimsMade),
                maxClaims: Number(maxClaims),
              },
            ];
          }
          if (status === 3) return [drop.claimKey, { kind: "refunded" }];
          if (status === 1 && nowSec >= Number(expiresAt)) {
            return [drop.claimKey, { kind: "expired" }];
          }
          if (status === 1) {
            return [
              drop.claimKey,
              {
                kind: "active",
                claimsMade: Number(claimsMade),
                maxClaims: Number(maxClaims),
              },
            ];
          }
          return [drop.claimKey, { kind: "unknown" }];
        } catch {
          return [drop.claimKey, { kind: "unknown" }];
        }
      }),
    );
    setStatuses(Object.fromEntries(entries));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLocal().then(refreshStatuses);
    }, [loadLocal, refreshStatuses]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const drops = await loadLocal();
    await refreshStatuses(drops);
    setRefreshing(false);
  }, [loadLocal, refreshStatuses]);

  async function copyLink(drop: SentDrop) {
    await Clipboard.setStringAsync(drop.link);
    setCopiedKey(drop.claimKey);
    setTimeout(() => setCopiedKey(null), 1600);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
          />
        }
      >
        <Text style={styles.screenTitle}>Activity</Text>

        <SectionLabel style={styles.sectionLabel}>Sent</SectionLabel>
        <Card style={styles.listCard}>
          {sent.length === 0 && (
            <Text style={styles.empty}>
              Gifts you send will show up here with their live status.
            </Text>
          )}
          {sent.map((drop) => {
            const status = statuses[drop.claimKey] ?? { kind: "unknown" };
            return (
              <View key={drop.claimKey} style={styles.row}>
                <StockLogo symbol={drop.symbol} size={34} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>
                    {formatUsd(drop.usd, 0)} {drop.symbol}
                  </Text>
                  <Text style={styles.rowSub}>
                    {new Date(drop.createdAt).toLocaleDateString()} ·{" "}
                    <StatusText status={status} />
                  </Text>
                  {status.kind === "expired" && (
                    <Text style={styles.refundHint}>
                      Expired - refund it from the web app to get the tokens
                      back.
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => copyLink(drop)} style={styles.copyBtn}>
                  <Ionicons
                    name={
                      copiedKey === drop.claimKey ? "checkmark" : "link-outline"
                    }
                    size={16}
                    color={
                      copiedKey === drop.claimKey
                        ? colors.success
                        : colors.secondary
                    }
                  />
                </Pressable>
              </View>
            );
          })}
        </Card>

        <SectionLabel style={styles.sectionLabel}>Received</SectionLabel>
        <Card style={styles.listCard}>
          {received.length === 0 && (
            <Text style={styles.empty}>
              Gifts you claim will show up here.
            </Text>
          )}
          {received.map((claim) => (
            <View key={`${claim.claimKey}-${claim.txHash}`} style={styles.row}>
              <StockLogo symbol={claim.symbol} size={34} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>
                  {claim.shares.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{" "}
                  {claim.symbol}
                </Text>
                <Text style={styles.rowSub}>
                  {new Date(claim.claimedAt).toLocaleDateString()}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  Linking.openURL(`${EXPLORER_URL}/tx/${claim.txHash}`)
                }
                style={styles.copyBtn}
              >
                <Ionicons name="open-outline" size={16} color={colors.secondary} />
              </Pressable>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusText({ status }: { status: DropStatus }) {
  switch (status.kind) {
    case "active":
      return (
        <Text style={styles.statusActive}>
          Active
          {status.maxClaims > 1
            ? ` · claimed ${status.claimsMade}/${status.maxClaims}`
            : ""}
        </Text>
      );
    case "claimed":
      return (
        <Text style={styles.statusClaimed}>
          Claimed {status.claimsMade}/{status.maxClaims}
        </Text>
      );
    case "expired":
      return <Text style={styles.statusExpired}>Expired</Text>;
    case "refunded":
      return <Text style={styles.statusMuted}>Refunded</Text>;
    default:
      return <Text style={styles.statusMuted}>…</Text>;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 40, gap: 10 },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.text,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sectionLabel: { marginTop: 8, marginLeft: 4 },
  listCard: { paddingVertical: 6 },
  empty: { paddingVertical: 14, fontSize: 13, color: colors.faint },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 12, color: colors.faint },
  refundHint: { fontSize: 11, color: "#b45309", marginTop: 2 },
  copyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusActive: { color: colors.success, fontWeight: "600" },
  statusClaimed: { color: colors.text, fontWeight: "600" },
  statusExpired: { color: "#b45309", fontWeight: "600" },
  statusMuted: { color: colors.faint },
});
