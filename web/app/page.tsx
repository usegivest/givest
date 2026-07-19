import HomePage from "@/components/HomePage";
import { formatVolumeUsd, getProtocolStats } from "@/lib/protocolStats";

export const revalidate = 300;
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function Page() {
  let initial = { volumeLabel: "$0", stockVolumeLabel: "$0", dropCount: 0 };

  try {
    const stats = await getProtocolStats(3_000);
    initial = {
      volumeLabel: formatVolumeUsd(stats.volumeUsd),
      stockVolumeLabel: formatVolumeUsd(stats.stockVolumeUsd),
      dropCount: stats.dropCount,
    };
  } catch (e) {
    console.error("[home stats]", e);
  }

  return <HomePage initial={initial} />;
}
