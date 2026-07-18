import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import DocsStockGrid from "@/components/DocsStockGrid";
import { CONTRACT_ADDRESS, STOCKS, WETH, EXPIRY_DAYS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Docs · Givest",
  description:
    "How Givest works: the escrow contract, claim links, gasless claims and supported stock tokens on Robinhood Chain.",
};

const EXPLORER = "https://robinhoodchain.blockscout.com";
const DEPLOY_TX =
  "0xfd84db411b90459292da51482cf756f049c4b2e875ab3d52bca6e70ee08bd398";
const SWAP_ROUTER = "0xCaf681a66D020601342297493863E78C959E5cb2";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 transition hover:decoration-gray-900"
    >
      {children}
    </a>
  );
}

function Card({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="popup-card-animate rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-8"
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <h2 className="text-lg font-semibold tracking-tight text-gray-900">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-600">
        {children}
      </div>
    </section>
  );
}

function AddressRow({
  label,
  address,
  href,
}: {
  label: string;
  address: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
        {label}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-gray-900 underline decoration-gray-300 underline-offset-4 transition hover:decoration-gray-900 sm:text-sm"
      >
        <span className="hidden lg:inline">{address}</span>
        <span className="lg:hidden">{short(address)}</span>
      </a>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/55 backdrop-blur-[3px]" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-28 pb-16">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Documentation
          </p>
          <h1 className="mt-4 text-[2.35rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem]">
            How it works. <span className="text-zinc-400">No magic.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            One open-source escrow contract on Robinhood Chain. Everything
            verifiable on-chain, nothing stored on our servers.
          </p>
        </header>

        <div className="mt-12 flex flex-col gap-5">
          <Card title="The flow in 60 seconds">
            <ol className="space-y-3">
              {[
                [
                  "Create",
                  "You pick a stock and an amount in USD. Your ETH is swapped to the real stock token on Uniswap and locked in the escrow contract - all in one transaction.",
                ],
                [
                  "Share",
                  "You get one private link. It carries a freshly generated claim key that exists only in the link itself. We never see or store it.",
                ],
                [
                  "Claim",
                  "The recipient opens the link, chooses a wallet, and signs with the embedded key. Our relayer submits the transaction and pays the gas - the recipient needs nothing.",
                ],
                [
                  "Refund",
                  `If the drop is never claimed, you can reclaim the tokens after ${EXPIRY_DAYS} days. Funds are never stranded.`,
                ],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <p>
                    <span className="font-semibold text-gray-900">{title}.</span>{" "}
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="The smart contract" delay={80}>
            <p>
              A single escrow contract holds every drop. It is deployed on{" "}
              <span className="font-medium text-gray-900">
                Robinhood Chain (chain id 4663)
              </span>{" "}
              and its source is public - verify everything yourself.
            </p>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4">
              <AddressRow
                label="Escrow contract"
                address={CONTRACT_ADDRESS}
                href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
              />
              <AddressRow
                label="Deployment tx"
                address={DEPLOY_TX}
                href={`${EXPLORER}/tx/${DEPLOY_TX}`}
              />
              <AddressRow
                label="WETH"
                address={WETH}
                href={`${EXPLORER}/address/${WETH}`}
              />
              <AddressRow
                label="Uniswap V3 router"
                address={SWAP_ROUTER}
                href={`${EXPLORER}/address/${SWAP_ROUTER}`}
              />
            </div>
            <p>
              The contract exposes four functions:{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                createDropWithEth
              </code>
              ,{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                createDrop
              </code>
              ,{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                claim
              </code>{" "}
              and{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                refund
              </code>
              . No admin keys, no upgradability, no pause switch.
            </p>
          </Card>

          <Card title="Security model" delay={160}>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-semibold text-gray-900">
                  Non-custodial.
                </span>{" "}
                Tokens sit in the escrow contract, never in our wallets. Only
                someone holding the claim key - or the sender after expiry -
                can move them.
              </li>
              <li>
                <span className="font-semibold text-gray-900">
                  The link is the key.
                </span>{" "}
                Each drop is bound to a one-time keypair generated in your
                browser. The private key lives in the URL fragment (
                <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                  #…
                </code>
                ), which is never sent to any server. Treat the link like cash.
              </li>
              <li>
                <span className="font-semibold text-gray-900">
                  The relayer can&apos;t steal.
                </span>{" "}
                It only submits transactions already signed by the claim key.
                The signature commits to the recipient address, so the relayer
                cannot redirect funds to itself.
              </li>
              <li>
                <span className="font-semibold text-gray-900">
                  Real economic exposure, not shares.
                </span>{" "}
                Stock tokens track the underlying equity but carry no
                shareholder rights.
              </li>
            </ul>
          </Card>

          <Card title="Supported stock tokens" delay={240}>
            <p>
              {STOCKS.length} deep-liquidity Robinhood stock tokens are listed.
              Prices come from Chainlink feeds. Swaps only use thick Uniswap
              routes on Robinhood Chain. Thin pools are blocked.
            </p>
            <DocsStockGrid />
          </Card>

          <Card title="FAQ" delay={320}>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-900">
                  Does the recipient need a wallet or ETH?
                </p>
                <p className="mt-1">
                  No. The claim is gasless - the relayer pays the network fee.
                  The recipient only chooses where the tokens should go.
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  What if I lose the link?
                </p>
                <p className="mt-1">
                  The claim key cannot be recovered - but your funds can. As
                  the sender you can call refund after {EXPIRY_DAYS} days and
                  get the tokens back.
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  What does it cost?
                </p>
                <p className="mt-1">
                  1% protocol fee on create (0.75% with 10k $GIVEST, free with
                  100k). Fees fund gasless claims, buybacks, and protocol
                  giveaways. You also pay normal network gas and the Uniswap
                  swap fee. Claiming stays free for the recipient.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <footer className="mx-auto mt-10 max-w-2xl text-center text-[10px] leading-4 text-gray-400">
          Contract addresses on this page are read live from the app
          configuration. Always verify on{" "}
          <a
            href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-gray-600"
          >
            Blockscout
          </a>{" "}
          before sending significant amounts.
        </footer>
      </main>
    </div>
  );
}
