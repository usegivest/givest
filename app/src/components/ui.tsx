import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, radius } from "@/lib/theme";

/** Rounded white card with a soft pink-tinted hairline - the Givest surface. */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export function PillButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "ghost" && styles.buttonGhost,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? colors.pillText : colors.text}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.buttonText,
              isPrimary ? styles.buttonTextPrimary : styles.buttonTextDark,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Small selectable chip used for presets (amounts, splits, windows). */
export function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected, style]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

/** Soft blush accent dot - matches the banner pink. */
export function AccentDot({ size = 6 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accent,
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 18,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.pill,
    paddingVertical: 15,
    paddingHorizontal: 22,
  },
  buttonPrimary: {
    backgroundColor: colors.pillBg,
  },
  buttonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonGhost: {
    backgroundColor: "transparent",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  buttonTextPrimary: {
    color: colors.pillText,
  },
  buttonTextDark: {
    color: colors.text,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondary,
  },
  chipTextSelected: {
    color: colors.accentDeep,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.faint,
  },
});
