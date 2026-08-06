import { NextResponse } from "next/server";

/**
 * Apple universal links for the Givest iOS app.
 * Set APPLE_TEAM_ID in Vercel env (10-character Team ID from Apple Developer).
 * Until it is set, Apple ignores the association file.
 */
export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return NextResponse.json(
      {
        applinks: { apps: [], details: [] },
        note: "Set APPLE_TEAM_ID to enable universal links for app.usegivest.givest",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  }

  const body = {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: `${teamId}.app.usegivest.givest`,
          paths: ["/claim", "/claim/*"],
        },
      ],
    },
    webcredentials: {
      apps: [`${teamId}.app.usegivest.givest`],
    },
  };

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
