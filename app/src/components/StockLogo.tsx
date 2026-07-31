import React, { useState } from "react";
import { StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { stockLogoUrl } from "@/lib/config";
import { colors } from "@/lib/theme";

/** Local assets for logos that must look right even offline / before deploy. */
const LOCAL: Record<string, ImageSourcePropType> = {
  ETH: require("../../assets/logos/ETH.png"),
};

type Props = {
  symbol: string;
  size?: number;
  /** Explicit logo URL (custom tokens from Blockscout). */
  src?: string | null;
};

export function StockLogo({ symbol, size = 28, src }: Props) {
  const [failed, setFailed] = useState(false);
  const key = symbol.toUpperCase();
  const local = LOCAL[key];
  const uri = src ?? (local ? null : stockLogoUrl(symbol));

  if (failed && !local) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={[styles.fallbackText, { fontSize: size * 0.38 }]}>
          {symbol.slice(0, 1).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Image
        source={local ?? { uri: uri! }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={120}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  fallbackText: {
    color: colors.accentDeep,
    fontWeight: "700",
  },
});
