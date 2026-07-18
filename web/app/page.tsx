import HomePage from "@/components/HomePage";
import { formatVolumeUsd, getProtocolStats } from "@/lib/protocolStats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  let initial = { volumeLabel: "$0", stockVolumeLabel: "$0", dropCount: 0 };

  try {
    const stats = await getProtocolStats();
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
