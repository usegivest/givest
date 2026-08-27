export type UpdateTag = "shipped" | "honest" | "fix";

export type Update = {
  date: string;
  title: string;
  body: string;
  tag: UpdateTag;
  href?: { label: string; url: string };
};

/** Newest first. Add a row here every time something actually ships. */
export const UPDATES: Update[] = [
  {
    date: "2026-08-27",
    title: "Refund from the status page",
    body: "If you sent the gift, pull the remaining tokens back from the same screen. After expiry, anyone can push them back to the sender.",
    tag: "shipped",
    href: { label: "Check a gift", url: "/status" },
  },
  {
    date: "2026-08-27",
    title: "Your gifts, with live claim counts",
    body: "Connect a wallet on /gifts to see every drop you created onchain. Recent sends on the send page now show claimed shares, not just a copy button.",
    tag: "shipped",
    href: { label: "Open your gifts", url: "/gifts" },
  },
  {
    date: "2026-08-27",
    title: "Look up any gift onchain",
    body: "Paste a claim link or a claim key and see if the gift is open, locked, claimed, or refunded. The read happens in your browser against the escrow contracts. The private key in a link never leaves the page.",
    tag: "shipped",
    href: { label: "Check a gift", url: "/status" },
  },
  {
    date: "2026-08-27",
    title: "A public updates log",
    body: "This page. Every ship we make lands here first, with a date and a link you can click. No more disappearing for a week and calling it progress.",
    tag: "shipped",
    href: { label: "Open the log", url: "/updates" },
  },
  {
    date: "2026-08-27",
    title: "The honest state of the app",
    body: "The iPhone app is not out, and it is not in App Store review. We had copy on the roadmap that said otherwise. That is fixed. Android is live as a direct APK. The website is live.",
    tag: "honest",
    href: { label: "Download Android", url: "/android" },
  },
];

export const THIS_WEEK: { title: string; body: string }[] = [
  {
    title: "A share receipt after you send",
    body: "Copy a ready tweet and the share card from the done screen, so the gift looks like a gift.",
  },
  {
    title: "Clearer copy on the claim page",
    body: "iPhone is not out. The claim flow should say that, the same way the homepage does now.",
  },
];
