import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/lib/theme";

/** The Givest logo mark (same path as the web brand). */
export function GivestMark({
  size = 56,
  color = colors.text,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <Path
        d="M 256 0 L 256 128 A 128 128 0 1 1 128 0 Z M 128 176 A 48 48 0 1 0 128 80 A 48 48 0 0 0 128 176 Z"
        fill={color}
      />
    </Svg>
  );
}
