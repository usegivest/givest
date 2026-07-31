import React, { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import Ionicons from "@expo/vector-icons/Ionicons";
import QRCode from "react-native-qrcode-svg";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { formatEther, parseEther } from "viem";
import {
  CONTRACT_ADDRESS,
  EXPIRY_DAYS,
  EXPLORER_URL,
  PROTOCOL_FEE,
  STOCKS,
  USDG,
  stockDropsAbi,
} from "@/lib/config";
import { newClaimKey, publicClient } from "@/lib/chain";
import {
  MAX_PRICE_IMPACT_PCT,
  formatShares,
  quoteBestStockSwap,
  type StockQuote,
} from "@/lib/quotes";
import { readEthUsd, readUsdPrice } from "@/lib/prices";
import { feeStatusFromBps, readFeeStatus, type FeeStatus } from "@/lib/fees";
import { buildClaimLink } from "@/lib/links";
import { saveSentDrop } from "@/lib/storage";
import { useWallet } from "@/lib/wallet";
import { colors, formatUsd, shortAddress } from "@/lib/theme";
import { Card, Chip, PillButton, SectionLabel } from "@/components/ui";
import { StockLogo } from "@/components/StockLogo";

const USD_PRESETS = [5, 10, 25, 50, 100];
const SPLIT_PRESETS = [1, 5, 10, 20] as const;
const SLIPPAGE = 0.9;

const GIVEAWAY_WINDOWS = [
  { label: "1 min", seconds: 60 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "30 min", seconds: 1800 },
] as const;

type DropMode = "normal" | "giveaway" | "scheduled";
type Phase = "form" | "confirming" | "done";

type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; quote: StockQuote; ethIn: bigint }
  | { status: "error"; message: string };

type DoneState = {
  link: string;
  txHash: string;
  symbol: string;
  usd: number;
  claimableAt: number;
  splits: number;
  mode: DropMode;
};

export default function SendScreen() {
  const { address, status, getWalletClient } = useWallet();
  const [symbol, setSymbol] = useState("NVDA");
  const [usdInput, setUsdInput] = useState("10");
  const [message, setMessage] = useState("");
  const [dropMode, setDropMode] = useState<DropMode>("normal");
  const [giveawayWindowSec, setGiveawayWindowSec] = useState(300);
  const [scheduleAt, setScheduleAt] = useState(
    () => new Date(Date.now() + 86400_000),
  );
  const [splits, setSplits] = useState<number>(1);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [needsFunding, setNeedsFunding] = useState<{
    required: bigint;
    balance: bigint;
  } | null>(null);
  const [done, setDone] = useState<DoneState | null>(null);
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [stockUsd, setStockUsd] = useState<number | null>(null);
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: "idle" });
  const [fee, setFee] = useState<FeeStatus>(() =>
    feeStatusFromBps(PROTOCOL_FEE.baseBps),
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  const stock = useMemo(
    () => STOCKS.find((s) => s.symbol === symbol) ?? STOCKS[0],
    [symbol],
  );
  const usd = Number(usdInput) || 0;

  useEffect(() => {
    readEthUsd().then(setEthUsd);
  }, []);

  useEffect(() => {
    let cancelled = false;
    readFeeStatus(address).then((next) => {
      if (!cancelled) setFee(next);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    setStockUsd(null);
    if (stock.feed) readUsdPrice(stock.feed).then(setStockUsd);
  }, [stock]);

  // Live quote, debounced like the web send page.
  useEffect(() => {
    if (!ethUsd || usd <= 0) {
      setQuoteState({ status: "idle" });
      return;
    }
    const ethIn = parseEther((usd / ethUsd).toFixed(18));
    if (ethIn <= 0n) {
      setQuoteState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setQuoteState({ status: "loading" });
    const timer = setTimeout(async () => {
      try {
        const quote = await quoteBestStockSwap(
          ethIn,
          stock.address,
          stockUsd,
          usd,
        );
        if (!cancelled) setQuoteState({ status: "ready", quote, ethIn });
      } catch (e) {
        if (!cancelled) {
          setQuoteState({
            status: "error",
            message:
              e instanceof Error
                ? e.message.split("\n")[0]
                : "Not enough deep liquidity for this size.",
          });
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stock.address, usd, ethUsd, stockUsd]);

  const approxShares = stockUsd && usd > 0 ? usd / stockUsd : null;
  const quotedShares =
    quoteState.status === "ready"
      ? Number(formatEther(quoteState.quote.amountOut))
      : null;
  const priceImpactPct =
    approxShares !== null && quotedShares !== null && approxShares > 0
      ? ((approxShares - quotedShares) / approxShares) * 100
      : null;
  const liquidityBlocked =
    priceImpactPct !== null && priceImpactPct > MAX_PRICE_IMPACT_PCT;

  function openSchedulePicker() {
    if (Platform.OS !== "android") return;
    DateTimePickerAndroid.open({
      value: scheduleAt,
      mode: "date",
      minimumDate: new Date(Date.now() + 10 * 60_000),
      onChange: (event, date) => {
        if (event.type !== "set" || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: "time",
          onChange: (timeEvent, dateTime) => {
            if (timeEvent.type === "set" && dateTime) setScheduleAt(dateTime);
          },
        });
      },
    });
  }

  async function submit() {
    setError(null);
    setNeedsFunding(null);
    try {
      if (status !== "ready" || !address) {
        throw new Error("Your wallet is not ready yet.");
      }
      if (usd <= 0) throw new Error("Enter an amount greater than $0.");
      if (!ethUsd) throw new Error("Could not fetch the ETH price. Try again.");
      if (liquidityBlocked) {
        throw new Error(
          `Not enough liquidity for ${formatUsd(usd, 0)} of ${stock.symbol}. Try a smaller amount.`,
        );
      }

      const giftEth = parseEther((usd / ethUsd).toFixed(18));
      const value = fee.grossFromGift(giftEth);

      // Check funding before anything else - walletless users start at 0 ETH.
      const balance = await publicClient.getBalance({ address });
      if (balance < value) {
        setNeedsFunding({ required: value, balance });
        return;
      }

      setPhase("confirming");
      const key = newClaimKey();

      let bestQuote: StockQuote;
      if (quoteState.status === "ready" && quoteState.ethIn === giftEth) {
        bestQuote = quoteState.quote;
      } else {
        bestQuote = await quoteBestStockSwap(
          giftEth,
          stock.address,
          stockUsd,
          usd,
        );
      }

      const route = bestQuote.route;
      const minOut =
        (bestQuote.amountOut * BigInt(Math.round(SLIPPAGE * 1000))) / 1000n;
      if (minOut <= 0n) {
        throw new Error("Quote too small. Try a different amount or stock.");
      }

      const nowSec = Math.floor(Date.now() / 1000);
      // Giveaway: unlock at a random second inside the window.
      // Scheduled: unlock at the exact picked date. Normal: instantly.
      let unlockAt = nowSec;
      if (dropMode === "giveaway") {
        unlockAt = nowSec + 1 + Math.floor(Math.random() * giveawayWindowSec);
      } else if (dropMode === "scheduled") {
        const picked = Math.floor(scheduleAt.getTime() / 1000);
        if (picked < nowSec + 300) {
          throw new Error("The unlock time must be at least 5 minutes from now.");
        }
        if (picked > nowSec + 5 * 365 * 86400) {
          throw new Error("The unlock time can be at most 5 years from now.");
        }
        unlockAt = picked;
      }
      // Scheduled gifts stay claimable for EXPIRY_DAYS after they open.
      const expiresAt = unlockAt + EXPIRY_DAYS * 86400;

      const walletClient = getWalletClient();
      const account = walletClient.account;
      if (!account) throw new Error("Your wallet is not ready yet.");

      let hash: `0x${string}`;
      if (route.kind === "v3") {
        hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: stockDropsAbi,
          functionName: "createDropWithEth",
          args: [
            key.address,
            stock.address,
            route.path,
            minOut,
            expiresAt,
            unlockAt,
            splits,
          ],
          value,
          account,
          chain: walletClient.chain,
        });
      } else if (route.kind === "v4") {
        hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: stockDropsAbi,
          functionName: "createDropWithEthV4",
          args: [
            key.address,
            stock.address,
            route.fee,
            route.tickSpacing,
            route.hooks,
            minOut,
            expiresAt,
            unlockAt,
            splits,
          ],
          value,
          account,
          chain: walletClient.chain,
        });
      } else {
        hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: stockDropsAbi,
          functionName: "createDropWithEthViaUsdgV4",
          args: [
            key.address,
            stock.address,
            USDG,
            route.ethToUsdgPath,
            route.fee,
            route.tickSpacing,
            route.hooks,
            minOut,
            expiresAt,
            unlockAt,
            splits,
          ],
          value,
          account,
          chain: walletClient.chain,
        });
      }
      await publicClient.waitForTransactionReceipt({ hash });

      const link = buildClaimLink(key.privateKey, message);
      await saveSentDrop({
        claimKey: key.address,
        link,
        symbol: stock.symbol,
        tokenAddress: stock.address,
        usd,
        splits,
        claimableAt: unlockAt,
        txHash: hash,
        createdAt: Date.now(),
      });

      setDone({
        link,
        txHash: hash,
        symbol: stock.symbol,
        usd,
        claimableAt: unlockAt,
        splits,
        mode: dropMode,
      });
      setPhase("done");
    } catch (e) {
      setPhase("form");
      setError(
        e instanceof Error ? e.message.split("\n")[0] : "Something went wrong",
      );
    }
  }

  async function copyLink(link: string) {
    await Clipboard.setStringAsync(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1600);
  }

  if (phase === "done" && done) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.doneHeader}>
            <View style={styles.doneCheck}>
              <Ionicons name="checkmark" size={30} color="#fff" />
            </View>
            <Text style={styles.doneTitle}>Gift created</Text>
            <Text style={styles.doneSubtitle}>
              {done.mode === "scheduled"
                ? `Sealed until ${new Date(done.claimableAt * 1000).toLocaleString()}. Share the link now - it opens exactly then.`
                : done.mode === "giveaway"
                  ? `Locked until ${new Date(done.claimableAt * 1000).toLocaleTimeString()}. Share the link anytime.`
                  : `${formatUsd(done.usd, 0)} of ${done.symbol} is secured in escrow until the link is claimed.`}
            </Text>
          </View>

          <Card style={styles.doneCard}>
            <SectionLabel>Private claim link</SectionLabel>
            <Text style={styles.doneLink} numberOfLines={2}>
              {done.link}
            </Text>
            <View style={styles.qrCenter}>
              <View style={styles.qrBox}>
                <QRCode value={done.link} size={168} color={colors.text} />
              </View>
            </View>
            {done.splits > 1 && (
              <Text style={styles.doneSplits}>
                {done.splits} winners · ~{formatUsd(done.usd / done.splits)} each
              </Text>
            )}
            <PillButton
              title="Share link"
              onPress={() => Share.share({ message: done.link })}
              icon={
                <Ionicons name="share-outline" size={16} color={colors.pillText} />
              }
            />
            <PillButton
              title={linkCopied ? "Copied" : "Copy link"}
              variant="secondary"
              onPress={() => copyLink(done.link)}
              icon={
                <Ionicons
                  name={linkCopied ? "checkmark" : "copy-outline"}
                  size={16}
                  color={linkCopied ? colors.success : colors.text}
                />
              }
            />
            <Pressable
              onPress={() => Linking.openURL(`${EXPLORER_URL}/tx/${done.txHash}`)}
            >
              <Text style={styles.txLink}>View transaction on Blockscout</Text>
            </Pressable>
          </Card>

          <PillButton
            title="Create another gift"
            variant="ghost"
            onPress={() => {
              setPhase("form");
              setDone(null);
              setMessage("");
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Send a stock gift</Text>

        <Card>
          <View style={styles.cardHeaderRow}>
            <SectionLabel>Stock</SectionLabel>
            {stockUsd !== null && (
              <Text style={styles.perToken}>
                {formatUsd(stockUsd)} per token
              </Text>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stockRow}
          >
            {STOCKS.map((s) => {
              const selected = s.symbol === symbol;
              return (
                <Pressable
                  key={s.symbol}
                  onPress={() => setSymbol(s.symbol)}
                  style={[styles.stockChip, selected && styles.stockChipSelected]}
                >
                  <StockLogo symbol={s.symbol} size={22} />
                  <Text
                    style={[
                      styles.stockChipText,
                      selected && styles.stockChipTextSelected,
                    ]}
                  >
                    {s.symbol}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.stockName}>{stock.name}</Text>
        </Card>

        <Card>
          <SectionLabel>Amount</SectionLabel>
          <View style={styles.amountRow}>
            <Text style={styles.amountCurrency}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={usdInput}
              onChangeText={(next) => {
                if (/^\d*\.?\d{0,2}$/.test(next)) setUsdInput(next);
              }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.faint}
            />
          </View>
          <View style={styles.chipRow}>
            {USD_PRESETS.map((v) => (
              <Chip
                key={v}
                label={`$${v}`}
                selected={usd === v}
                onPress={() => setUsdInput(String(v))}
              />
            ))}
          </View>

          {usd > 0 && (
            <View style={styles.quoteBox}>
              {quoteState.status === "loading" && (
                <Text style={styles.quoteMuted}>Fetching live Uniswap quote…</Text>
              )}
              {quoteState.status === "error" && (
                <Text style={styles.quoteError}>{quoteState.message}</Text>
              )}
              {quoteState.status === "ready" && (
                <>
                  <Text style={styles.quoteShares}>
                    ≈ {formatShares(quoteState.quote.amountOut)} {stock.symbol}
                  </Text>
                  <Text style={styles.quoteMeta}>
                    via {quoteState.quote.routeLabel}
                    {priceImpactPct !== null &&
                      Math.abs(priceImpactPct) >= 0.1 &&
                      ` · impact ${priceImpactPct > 0 ? "−" : "+"}${Math.abs(priceImpactPct).toFixed(1)}%`}
                  </Text>
                  <Text style={styles.quoteMeta}>
                    {fee.label}
                    {fee.bps > 0 &&
                      ethUsd !== null &&
                      ` · ~${formatUsd(
                        Number(
                          formatEther(
                            fee.feeFromGross(fee.grossFromGift(quoteState.ethIn)),
                          ),
                        ) * ethUsd,
                      )} on top`}
                  </Text>
                  {liquidityBlocked && (
                    <Text style={styles.quoteError}>
                      Not enough liquidity for this size. Try a smaller amount.
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
        </Card>

        <Card>
          <SectionLabel>Drop type</SectionLabel>
          <View style={styles.chipRow}>
            {(
              [
                ["normal", "Normal"],
                ["giveaway", "Giveaway"],
                ["scheduled", "Scheduled"],
              ] as const
            ).map(([mode, label]) => (
              <Chip
                key={mode}
                label={label}
                selected={dropMode === mode}
                onPress={() => setDropMode(mode)}
              />
            ))}
          </View>
          {dropMode === "normal" && (
            <Text style={styles.modeHint}>
              Claim opens instantly. Best for gifts and DMs.
            </Text>
          )}
          {dropMode === "giveaway" && (
            <>
              <Text style={styles.modeHint}>
                Claiming unlocks at a random time inside your window. Stops
                instant snipes.
              </Text>
              <View style={styles.chipRow}>
                {GIVEAWAY_WINDOWS.map((w) => (
                  <Chip
                    key={w.seconds}
                    label={w.label}
                    selected={giveawayWindowSec === w.seconds}
                    onPress={() => setGiveawayWindowSec(w.seconds)}
                  />
                ))}
              </View>
            </>
          )}
          {dropMode === "scheduled" && (
            <>
              <Text style={styles.modeHint}>
                Pick when the gift opens - a birthday, next New Year. The unlock
                is enforced onchain. It stays claimable for {EXPIRY_DAYS} days
                after it opens.
              </Text>
              {Platform.OS === "android" ? (
                <PillButton
                  title={scheduleAt.toLocaleString()}
                  variant="secondary"
                  onPress={openSchedulePicker}
                />
              ) : (
                <DateTimePicker
                  value={scheduleAt}
                  mode="datetime"
                  minimumDate={new Date(Date.now() + 10 * 60_000)}
                  onChange={(_, date) => {
                    if (date) setScheduleAt(date);
                  }}
                  style={styles.datePicker}
                />
              )}
            </>
          )}
        </Card>

        <Card>
          <SectionLabel>Winners</SectionLabel>
          <Text style={styles.modeHint}>
            Split the gift across multiple wallets. One shared link - each
            address claims once.
          </Text>
          <View style={styles.chipRow}>
            {SPLIT_PRESETS.map((n) => (
              <Chip
                key={n}
                label={n === 1 ? "1 winner" : String(n)}
                selected={splits === n}
                onPress={() => setSplits(n)}
              />
            ))}
          </View>
          {splits > 1 && usd > 0 && (
            <Text style={styles.splitHint}>
              ~{formatUsd(usd / splits)} of {stock.symbol} per winner
            </Text>
          )}
        </Card>

        <Card>
          <SectionLabel>Message (optional)</SectionLabel>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            maxLength={140}
            placeholder={`A little ${stock.symbol} for your future.`}
            placeholderTextColor={colors.faint}
          />
        </Card>

        {needsFunding && address && (
          <Card style={styles.fundCard}>
            <Text style={styles.fundTitle}>Fund your wallet first</Text>
            <Text style={styles.fundBody}>
              This gift needs {Number(formatEther(needsFunding.required)).toFixed(5)}{" "}
              ETH (plus a little gas). Your balance is{" "}
              {Number(formatEther(needsFunding.balance)).toFixed(5)} ETH. Send
              ETH on Robinhood Chain to your address:
            </Text>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(address);
                setAddressCopied(true);
                setTimeout(() => setAddressCopied(false), 1600);
              }}
              style={styles.fundAddressRow}
            >
              <Text style={styles.fundAddress}>{shortAddress(address)}</Text>
              <Ionicons
                name={addressCopied ? "checkmark" : "copy-outline"}
                size={15}
                color={addressCopied ? colors.success : colors.secondary}
              />
            </Pressable>
          </Card>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <PillButton
          title={
            phase === "confirming"
              ? "Creating gift…"
              : `Create ~${formatUsd(usd, 0)} ${stock.symbol} gift`
          }
          onPress={submit}
          loading={phase === "confirming"}
          disabled={
            usd <= 0 ||
            liquidityBlocked ||
            quoteState.status !== "ready"
          }
        />
        <Text style={styles.footerNote}>
          Secured by the Givest escrow contract on Robinhood Chain.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 48, gap: 14 },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.text,
    paddingTop: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  perToken: { fontSize: 12, color: colors.faint },
  stockRow: { gap: 8, paddingVertical: 12 },
  stockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  stockChipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  stockChipText: { fontSize: 13, fontWeight: "600", color: colors.secondary },
  stockChipTextSelected: { color: colors.accentDeep },
  stockName: { fontSize: 12, color: colors.faint },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingVertical: 8,
  },
  amountCurrency: { fontSize: 30, fontWeight: "500", color: colors.faint },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: "600",
    letterSpacing: -1,
    color: colors.text,
    paddingVertical: 4,
    paddingLeft: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  quoteBox: {
    marginTop: 14,
    padding: 13,
    borderRadius: 14,
    backgroundColor: colors.bg,
    gap: 3,
  },
  quoteMuted: { fontSize: 13, color: colors.faint },
  quoteError: { fontSize: 13, color: colors.danger },
  quoteShares: { fontSize: 15, fontWeight: "600", color: colors.text },
  quoteMeta: { fontSize: 12, color: colors.secondary },
  modeHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondary,
  },
  datePicker: { alignSelf: "flex-start", marginTop: 10 },
  splitHint: { marginTop: 10, fontSize: 12, color: colors.faint },
  messageInput: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  fundCard: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    gap: 8,
  },
  fundTitle: { fontSize: 15, fontWeight: "700", color: "#92400e" },
  fundBody: { fontSize: 13, lineHeight: 19, color: "#92400e" },
  fundAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#fef3c7",
  },
  fundAddress: { fontSize: 13, fontFamily: "Menlo", color: "#92400e" },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    padding: 13,
    overflow: "hidden",
  },
  footerNote: {
    textAlign: "center",
    fontSize: 11,
    color: colors.faint,
  },
  doneHeader: { alignItems: "center", gap: 10, paddingTop: 26 },
  doneCheck: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.text,
  },
  doneSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondary,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  doneCard: { gap: 12 },
  doneLink: { fontSize: 12, lineHeight: 17, color: colors.secondary },
  qrCenter: { alignItems: "center", paddingVertical: 6 },
  qrBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  doneSplits: {
    textAlign: "center",
    fontSize: 12,
    color: colors.secondary,
  },
  txLink: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondary,
    paddingVertical: 4,
  },
});
