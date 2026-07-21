import { defineChain, type Address } from "viem";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL ??
          "https://rpc.mainnet.chain.robinhood.com",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as Address;

/** All deployed escrow contracts (volume is summed across these). */
export const ESCROW_ADDRESSES = [
  CONTRACT_ADDRESS,
  "0xA318294016823c058E9c4d4f7FA4F5aef41775cC",
  "0x34865AA5953828798f53d9A4376e8A144488b53A",
  "0xD0836feE7b5961957e0b2536355108a3cf4d23e2",
  "0x73805b9A31857c89cbf89038f1134d6a9104a6c7",
  "0x2F0F423EB3EbCEE1A2cb12148f6De7F12920a53c",
].filter(
  (a, i, arr) =>
    a !== "0x0000000000000000000000000000000000000000" &&
    arr.findIndex((b) => b.toLowerCase() === a.toLowerCase()) === i,
) as Address[];

/** Givest token for holder fee discounts. */
export const GIVEST_TOKEN = (process.env.NEXT_PUBLIC_GIVEST_TOKEN ??
  "0x0188da44dcc9b6c9d0d80de904c633c5ff227777") as Address;

/** Protocol fee defaults (mirrored on-chain; UI reads live when possible). */
export const PROTOCOL_FEE = {
  baseBps: 100, // 1.00%
  tier1Bps: 75, // 0.75% at ≥ 10k
  tier2Bps: 0, // free at ≥ 100k
  tier1Threshold: 10_000n * 10n ** 18n,
  tier2Threshold: 100_000n * 10n ** 18n,
} as const;

export const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as Address;
export const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as Address;
export const UNISWAP_FACTORY = "0x1f7d7550b1b028f7571e69a784071f0205fd2efa" as Address;
export const POOL_MANAGER = "0x8366a39CC670B4001A1121B8F6A443A643e40951" as Address;
export const QUOTER_V3 = "0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7" as Address;
export const QUOTER_V4 = "0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94" as Address;
export const ETH_USD_FEED = "0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9" as Address;

export type Stock = {
  symbol: string;
  name: string;
  address: Address;
  /** Chainlink price feed proxy (USD, 8 decimals). Null if no feed exists yet. */
  feed: Address | null;
  /** Remote logo URL (custom tokens). Listed stocks use /logos/{symbol}.png. */
  icon?: string | null;
};

/**
 * Only tickers with deep Uniswap liquidity on Robinhood Chain.
 * Thin V3-only names are excluded so large sends cannot route through junk pools.
 */
export const STOCKS: Stock[] = [
  { symbol: "GIVEST", name: "Givest", address: GIVEST_TOKEN, feed: null },
  { symbol: "NVDA", name: "NVIDIA", address: "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec", feed: "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15" },
  { symbol: "AAPL", name: "Apple", address: "0xaf3d76f1834a1d425780943c99ea8a608f8a93f9", feed: "0x6B22A786bAa607d76728168703a39Ea9C99f2cD0" },
  { symbol: "TSLA", name: "Tesla", address: "0x322f0929c4625ed5bad873c95208d54e1c003b2d", feed: "0x4A1166a659A55625345e9515b32adECea5547C38" },
  { symbol: "MSFT", name: "Microsoft", address: "0xe93237c50d904957cf27e7b1133b510c669c2e74", feed: "0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E" },
  { symbol: "META", name: "Meta", address: "0xc0d6457c16cc70d6790dd43521c899c87ce02f35", feed: "0x7C38C00C30BEe9378381E7B6135d7283356D71b1" },
  { symbol: "GOOGL", name: "Alphabet", address: "0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3", feed: "0xF6f373a037c30F0e5010d854385cA89185AE638b" },
  { symbol: "AMZN", name: "Amazon", address: "0x12f190a9f9d7d37a250758b26824b97ce941bf54", feed: "0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C" },
  { symbol: "SPCX", name: "SpaceX", address: "0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea", feed: "0xB265810950ba6c5C0Ff821c9963014a56fD8Bffb" },
  { symbol: "MU", name: "Micron", address: "0xff080c8ce2e5feadaca0da81314ae59d232d4afd", feed: "0x425EEFdCf05ed6526C3cE61Af99429A228a6d596" },
];

export const stockBySymbol = (symbol: string) =>
  STOCKS.find((s) => s.symbol === symbol) ?? null;

export const stockByAddress = (address: string) =>
  STOCKS.find((s) => s.address.toLowerCase() === address.toLowerCase()) ?? null;

export const EXPIRY_DAYS = 30;

export const stockDropsAbi = [
  {
    type: "function",
    name: "createDropWithEth",
    stateMutability: "payable",
    inputs: [
      { name: "claimKey", type: "address" },
      { name: "token", type: "address" },
      { name: "path", type: "bytes" },
      { name: "minOut", type: "uint256" },
      { name: "expiresAt", type: "uint40" },
      { name: "claimableAt", type: "uint40" },
      { name: "splits", type: "uint16" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "createDropWithEthV4",
    stateMutability: "payable",
    inputs: [
      { name: "claimKey", type: "address" },
      { name: "token", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickSpacing", type: "int24" },
      { name: "hooks", type: "address" },
      { name: "minOut", type: "uint256" },
      { name: "expiresAt", type: "uint40" },
      { name: "claimableAt", type: "uint40" },
      { name: "splits", type: "uint16" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "createDropWithEthViaUsdgV4",
    stateMutability: "payable",
    inputs: [
      { name: "claimKey", type: "address" },
      { name: "token", type: "address" },
      { name: "usdg", type: "address" },
      { name: "ethToUsdgPath", type: "bytes" },
      { name: "usdgStockFee", type: "uint24" },
      { name: "usdgStockTickSpacing", type: "int24" },
      { name: "hooks", type: "address" },
      { name: "minOut", type: "uint256" },
      { name: "expiresAt", type: "uint40" },
      { name: "claimableAt", type: "uint40" },
      { name: "splits", type: "uint16" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "createDrop",
    stateMutability: "nonpayable",
    inputs: [
      { name: "claimKey", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiresAt", type: "uint40" },
      { name: "claimableAt", type: "uint40" },
      { name: "splits", type: "uint16" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "claimKey", type: "address" },
      { name: "recipient", type: "address" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "claimKey", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "hasClaimed",
    stateMutability: "view",
    inputs: [
      { name: "claimKey", type: "address" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "drops",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "sender", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint128" },
      { name: "amountPerClaim", type: "uint128" },
      { name: "expiresAt", type: "uint40" },
      { name: "claimableAt", type: "uint40" },
      { name: "maxClaims", type: "uint16" },
      { name: "claimsMade", type: "uint16" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "claimDigest",
    stateMutability: "view",
    inputs: [
      { name: "claimKey", type: "address" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "feeBpsFor",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint16" }],
  },
  {
    type: "function",
    name: "splitGross",
    stateMutability: "pure",
    inputs: [
      { name: "gross", type: "uint256" },
      { name: "bps", type: "uint16" },
    ],
    outputs: [
      { name: "net", type: "uint256" },
      { name: "feeAmt", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "baseFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint16" }],
  },
  {
    type: "function",
    name: "tier1Threshold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "tier2Threshold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "givestToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export const aggregatorAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

export const factoryAbi = [
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [
      { name: "a", type: "address" },
      { name: "b", type: "address" },
      { name: "fee", type: "uint24" },
    ],
    outputs: [{ type: "address" }],
  },
] as const;

export const poolAbi = [
  {
    type: "function",
    name: "liquidity",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint128" }],
  },
] as const;

/** Uniswap V3 QuoterV2 - returns quote via eth_call (non-view). */
export const quoterV3Abi = [
  {
    type: "function",
    name: "quoteExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "path", type: "bytes" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96AfterList", type: "uint160[]" },
      { name: "initializedTicksCrossedList", type: "uint32[]" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

/** Uniswap V4 Quoter - quoteExactInputSingle. */
export const quoterV4Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;
