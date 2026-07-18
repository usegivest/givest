# Givest contracts

Foundry project for `StockDrops.sol` - the escrow contract behind Givest.

One contract does everything: wraps ETH, swaps to the stock token on Uniswap (v3 or v4), locks the output in escrow bound to a one-time claim key, and pays out when the claim key signs the receiver's address. Supports giveaway unlock windows, split drops (N winners per link), protocol fees with $GIVEST holder discounts, and sender refunds.

## Setup

```bash
forge install foundry-rs/forge-std
```

## Test

Tests fork Robinhood Chain mainnet:

```bash
forge test --fork-url https://rpc.mainnet.chain.robinhood.com
```

## Deploy

```bash
forge create src/StockDrops.sol:StockDrops \
  --rpc-url https://rpc.mainnet.chain.robinhood.com \
  --private-key $DEPLOYER_KEY --broadcast \
  --constructor-args <WETH> <V3_ROUTER> <V4_POOL_MANAGER> <FEE_RECIPIENT>
```

See the root README for mainnet addresses.
