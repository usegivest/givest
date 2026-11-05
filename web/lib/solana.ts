import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  type AddressLookupTableAccount,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { SOL_MINT, isListedMint, stockByAddress } from "./config";

const JUPITER = "https://lite-api.jup.ag/swap/v1";

export function serverConnection(): Connection {
  const url = process.env.SOLANA_RPC_URL;
  if (!url) throw new Error("SOLANA_RPC_URL is not set");
  return new Connection(url, "confirmed");
}

export function browserConnection(): Connection {
  if (typeof window === "undefined") return serverConnection();
  return new Connection(`${window.location.origin}/api/rpc`, "confirmed");
}

export function isSolanaAddress(value: string): boolean {
  try {
    return new PublicKey(value).toBytes().length === 32;
  } catch {
    return false;
  }
}

export function newClaimKey(): { secret: string; publicKey: string } {
  const kp = Keypair.generate();
  return { secret: bs58.encode(kp.secretKey), publicKey: kp.publicKey.toBase58() };
}

export function keypairFromSecret(secret: string): Keypair {
  const raw = secret.startsWith("sol:") ? secret.slice(4) : secret;
  const bytes = bs58.decode(raw);
  if (bytes.length !== 64) throw new Error("Invalid claim key");
  return Keypair.fromSecretKey(bytes);
}

export function isClaimSecret(value: string): boolean {
  try {
    keypairFromSecret(value);
    return true;
  } catch {
    return false;
  }
}

type JupIx = {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
};

type JupSwapIxs = {
  computeBudgetInstructions: JupIx[];
  setupInstructions: JupIx[];
  swapInstruction: JupIx | null;
  cleanupInstruction: JupIx | null;
  addressLookupTableAddresses: string[];
};

function toIx(ix: JupIx): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((a) => ({
      pubkey: new PublicKey(a.pubkey),
      isSigner: a.isSigner,
      isWritable: a.isWritable,
    })),
    data: Buffer.from(ix.data, "base64"),
  });
}

export async function jupiterQuote(inputLamports: bigint, outputMint: string) {
  const url = new URL(`${JUPITER}/quote`);
  url.searchParams.set("inputMint", SOL_MINT);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", inputLamports.toString());
  url.searchParams.set("slippageBps", "400");
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.outAmount) {
    throw new Error(body?.error || "No Jupiter route for this amount. Try a smaller size.");
  }
  return body as { outAmount: string; otherAmountThreshold: string };
}

async function jupiterInstructions(
  quote: unknown,
  user: PublicKey,
  destination: PublicKey,
): Promise<JupSwapIxs> {
  const res = await fetch(`${JUPITER}/swap-instructions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: user.toBase58(),
      destinationTokenAccount: destination.toBase58(),
      dynamicComputeUnitLimit: true,
      wrapAndUnwrapSol: true,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.swapInstruction) {
    throw new Error(body?.error || "Could not build the swap. Try again.");
  }
  return body as JupSwapIxs;
}

export async function buildStockDropTxFor(args: {
  sender: PublicKey;
  mint: string;
  claimOwner: PublicKey;
  giftLamports: bigint;
  feeLamports: bigint;
  treasury: PublicKey | null;
}): Promise<{
  tx: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
  outAmount: bigint;
}> {
  if (!isListedMint(args.mint)) throw new Error("That stock is not listed.");
  if (args.giftLamports <= 0n) throw new Error("Amount must be greater than 0.");

  const connection = browserConnection();
  const mint = new PublicKey(args.mint);
  const destination = getAssociatedTokenAddressSync(
    mint,
    args.claimOwner,
    false,
    TOKEN_2022_PROGRAM_ID,
  );
  const quote = await jupiterQuote(args.giftLamports, args.mint);
  const ixs = await jupiterInstructions(quote, args.sender, destination);

  const instructions: TransactionInstruction[] = [
    ...ixs.computeBudgetInstructions.map(toIx),
  ];
  if (args.feeLamports > 0n && args.treasury) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: args.sender,
        toPubkey: args.treasury,
        lamports: Number(args.feeLamports),
      }),
    );
  }
  instructions.push(...ixs.setupInstructions.map(toIx));
  if (ixs.swapInstruction) instructions.push(toIx(ixs.swapInstruction));
  if (ixs.cleanupInstruction) instructions.push(toIx(ixs.cleanupInstruction));

  const lookups: AddressLookupTableAccount[] = [];
  for (const address of ixs.addressLookupTableAddresses ?? []) {
    const res = await connection.getAddressLookupTable(new PublicKey(address));
    if (!res.value) throw new Error("Could not load the swap route. Try again.");
    lookups.push(res.value);
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: args.sender,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookups);

  return {
    tx: new VersionedTransaction(message),
    blockhash,
    lastValidBlockHeight,
    outAmount: BigInt(quote.outAmount),
  };
}

export async function confirmSignature(
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number,
) {
  const connection = browserConnection();
  const result = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (result.value.err) throw new Error("The transaction failed on Solana.");
}

type Held = {
  mint: string;
  raw: bigint;
  uiAmount: number;
  decimals: number;
};

export async function holdingOf(owner: string): Promise<Held | null> {
  let key: PublicKey;
  try {
    key = new PublicKey(owner);
  } catch {
    return null;
  }
  const connection =
    typeof window === "undefined" ? serverConnection() : browserConnection();
  const accounts = await connection.getParsedTokenAccountsByOwner(key, {
    programId: TOKEN_2022_PROGRAM_ID,
  });
  let best: Held | null = null;
  for (const row of accounts.value) {
    const info = row.account.data.parsed?.info;
    if (!info?.mint || !info.tokenAmount) continue;
    const raw = BigInt(info.tokenAmount.amount ?? "0");
    if (raw <= 0n) continue;
    const listed = isListedMint(info.mint);
    if (!listed && best) continue;
    const held: Held = {
      mint: info.mint,
      raw,
      uiAmount: Number(info.tokenAmount.uiAmount ?? 0),
      decimals: Number(info.tokenAmount.decimals ?? 8),
    };
    if (!best || listed || held.raw > best.raw) best = held;
    if (listed) break;
  }
  return best;
}

function decodeTransferChecked(data: Buffer): { amount: bigint } | null {
  if (data.length < 10 || data[0] !== 12) return null;
  return { amount: data.readBigUInt64LE(1) };
}

/**
 * Relayer pays the fee. It only co-signs a Token-2022 transfer of a listed
 * xStock from the claim wallet to the recipient, plus the recipient's
 * token account if it does not exist yet.
 */
export async function submitRelayedClaim(txBase64: string): Promise<string> {
  const secret = process.env.SOLANA_RELAYER_SECRET;
  if (!secret) throw new Error("The relayer is not configured.");
  const relayer = keypairFromSecret(secret);
  const connection = serverConnection();
  const tx = Transaction.from(Buffer.from(txBase64, "base64"));
  if (!tx.feePayer?.equals(relayer.publicKey)) {
    throw new Error("Invalid claim transaction.");
  }

  const instructions = tx.instructions;
  if (instructions.length < 1 || instructions.length > 2) {
    throw new Error("Invalid claim transaction.");
  }

  const transferIx = instructions[instructions.length - 1];
  const decoded = decodeTransferChecked(Buffer.from(transferIx.data));
  if (!decoded || !transferIx.programId.equals(TOKEN_2022_PROGRAM_ID)) {
    throw new Error("Invalid claim transaction.");
  }
  const mint = transferIx.keys[1]?.pubkey;
  const source = transferIx.keys[0]?.pubkey;
  const dest = transferIx.keys[2]?.pubkey;
  const authority = transferIx.keys[3]?.pubkey;
  if (!mint || !source || !dest || !authority || !isListedMint(mint.toBase58())) {
    throw new Error("Invalid claim transaction.");
  }
  const stock = stockByAddress(mint.toBase58());
  if (!stock) throw new Error("Invalid claim transaction.");

  const expectedSource = getAssociatedTokenAddressSync(
    mint,
    authority,
    false,
    TOKEN_2022_PROGRAM_ID,
  );
  if (!source.equals(expectedSource)) throw new Error("Invalid claim transaction.");

  let recipient: PublicKey;
  if (instructions.length === 2) {
    const createIx = instructions[0];
    if (!createIx.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
      throw new Error("Invalid claim transaction.");
    }
    if (createIx.data.length !== 1 || createIx.data[0] !== 1) {
      throw new Error("Invalid claim transaction.");
    }
    if (!createIx.keys[0]?.pubkey.equals(relayer.publicKey)) {
      throw new Error("Invalid claim transaction.");
    }
    recipient = createIx.keys[2].pubkey;
    const expectedDest = getAssociatedTokenAddressSync(
      mint,
      recipient,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    if (!dest.equals(expectedDest) || !createIx.keys[1]?.pubkey.equals(expectedDest)) {
      throw new Error("Invalid claim transaction.");
    }
    if (!createIx.keys[3]?.pubkey.equals(mint)) throw new Error("Invalid claim transaction.");
    if (!createIx.keys[5]?.pubkey.equals(TOKEN_2022_PROGRAM_ID)) {
      throw new Error("Invalid claim transaction.");
    }
  } else {
    const info = await connection.getParsedAccountInfo(dest);
    const owner = info.value?.data && "parsed" in info.value.data
      ? info.value.data.parsed?.info?.owner
      : null;
    if (!owner) throw new Error("Recipient account is missing.");
    recipient = new PublicKey(owner);
    const expectedDest = getAssociatedTokenAddressSync(
      mint,
      recipient,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    if (!dest.equals(expectedDest)) throw new Error("Invalid claim transaction.");
  }

  const sourceInfo = await connection.getTokenAccountBalance(source);
  if (BigInt(sourceInfo.value.amount) !== decoded.amount || decoded.amount <= 0n) {
    throw new Error("This gift is no longer available.");
  }

  const message = tx.serializeMessage();
  const sig = tx.signatures.find((s) => s.publicKey.equals(authority));
  if (!sig?.signature) throw new Error("Invalid signature.");
  const ok = nacl.sign.detached.verify(
    message,
    sig.signature,
    authority.toBytes(),
  );
  if (!ok) throw new Error("Invalid signature.");

  tx.partialSign(relayer);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, ...latest },
    "confirmed",
  );
  return signature;
}

export async function buildClaimTx(args: {
  claimSecret: string;
  recipient: string;
  relayer: string;
}): Promise<string> {
  const claim = keypairFromSecret(args.claimSecret);
  const recipient = new PublicKey(args.recipient);
  const relayer = new PublicKey(args.relayer);
  const held = await holdingOf(claim.publicKey.toBase58());
  if (!held || held.raw <= 0n) throw new Error("This gift is empty.");
  const mint = new PublicKey(held.mint);
  const source = getAssociatedTokenAddressSync(
    mint,
    claim.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
  );
  const dest = getAssociatedTokenAddressSync(
    mint,
    recipient,
    false,
    TOKEN_2022_PROGRAM_ID,
  );
  const connection = browserConnection();
  const destInfo = await connection.getAccountInfo(dest);
  const tx = new Transaction();
  tx.feePayer = relayer;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  if (!destInfo) {
    const { createAssociatedTokenAccountIdempotentInstruction } = await import(
      "@solana/spl-token"
    );
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        relayer,
        dest,
        recipient,
        mint,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
  }
  const { createTransferCheckedInstruction } = await import("@solana/spl-token");
  tx.add(
    createTransferCheckedInstruction(
      source,
      mint,
      dest,
      claim.publicKey,
      held.raw,
      held.decimals,
      [],
      TOKEN_2022_PROGRAM_ID,
    ),
  );
  tx.partialSign(claim);
  return tx.serialize({ requireAllSignatures: false }).toString("base64");
}

export async function refundClaimTo(args: {
  claimSecret: string;
  sender: PublicKey;
  sign: (tx: Transaction) => Promise<Transaction>;
}): Promise<string> {
  const claim = keypairFromSecret(args.claimSecret);
  const held = await holdingOf(claim.publicKey.toBase58());
  if (!held || held.raw <= 0n) throw new Error("Nothing left to refund.");
  const mint = new PublicKey(held.mint);
  const source = getAssociatedTokenAddressSync(
    mint,
    claim.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
  );
  const dest = getAssociatedTokenAddressSync(
    mint,
    args.sender,
    false,
    TOKEN_2022_PROGRAM_ID,
  );
  const connection = browserConnection();
  const { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction } =
    await import("@solana/spl-token");
  const tx = new Transaction();
  tx.feePayer = args.sender;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      args.sender,
      dest,
      args.sender,
      mint,
      TOKEN_2022_PROGRAM_ID,
    ),
  );
  tx.add(
    createTransferCheckedInstruction(
      source,
      mint,
      dest,
      claim.publicKey,
      held.raw,
      held.decimals,
      [],
      TOKEN_2022_PROGRAM_ID,
    ),
  );
  tx.partialSign(claim);
  const signed = await args.sign(tx);
  const signature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  return signature;
}
