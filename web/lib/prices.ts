import { formatUnits, type Address } from "viem";
import { publicClient } from "./chain";
import { aggregatorAbi, ETH_USD_FEED } from "./config";

export async function readUsdPrice(feed: Address): Promise<number | null> {
  try {
    const [, answer, , updatedAt] = await publicClient.readContract({
      address: feed,
      abi: aggregatorAbi,
      functionName: "latestRoundData",
    });
    if (answer <= 0n || updatedAt === 0n) return null;
    return Number(formatUnits(answer, 8));
  } catch {
    return null;
  }
}

export const readEthUsd = () => readUsdPrice(ETH_USD_FEED);
