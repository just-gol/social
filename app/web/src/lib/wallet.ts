import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionVersion,
  VersionedTransaction,
} from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";

export type WalletMode = "browser-wallet" | "local-readonly" | "local-keypair";

type Signable = Transaction | VersionedTransaction;

type BrowserWalletLike = Wallet & {
  publicKey: PublicKey;
  connect?: (opts?: { onlyIfTrusted?: boolean }) => Promise<unknown>;
  disconnect?: () => Promise<unknown>;
  signTransaction?: (transaction: Signable) => Promise<Signable>;
  signAllTransactions?: (transactions: Signable[]) => Promise<Signable[]>;
};

export function getBrowserWallet(): BrowserWalletLike | null {
  const provider = (window as { solana?: BrowserWalletLike }).solana;
  if (provider?.publicKey) {
    return provider;
  }
  if (provider?.connect) {
    return provider;
  }
  return null;
}

export function createReadonlyProvider(connection: Connection) {
  const burnWallet = {
    publicKey: Keypair.generate().publicKey,
    signAllTransactions: async <T extends Signable>(txs: T[]) => txs,
    signTransaction: async <T extends Signable>(tx: T) => tx,
  } as Wallet;
  return new AnchorProvider(connection, burnWallet, { commitment: "confirmed" });
}

export function createBrowserProvider(
  connection: Connection,
  wallet: BrowserWalletLike
) {
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

function signWithKeypair<T extends Signable>(transaction: T, keypair: Keypair): T {
  if (transaction instanceof VersionedTransaction) {
    transaction.sign([keypair]);
    return transaction;
  }
  transaction.partialSign(keypair);
  return transaction;
}

export function parseLocalKeypairSecret(secret: string) {
  const trimmed = secret.trim();
  if (!trimmed) {
    throw new Error("Paste a local keypair secret first.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Local keypair must be a JSON array exported from Solana CLI.");
  }

  if (!Array.isArray(parsed) || parsed.some((value) => !Number.isInteger(value))) {
    throw new Error("Secret key JSON must contain only integers.");
  }

  if (parsed.length !== 64) {
    throw new Error("Secret key JSON must contain 64 bytes.");
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed));
}

export function createLocalKeypairProvider(
  connection: Connection,
  keypair: Keypair
) {
  const wallet = {
    publicKey: keypair.publicKey,
    signAllTransactions: async <T extends Signable>(txs: T[]) =>
      txs.map((transaction) => signWithKeypair(transaction, keypair)),
    signTransaction: async <T extends Signable>(transaction: T) =>
      signWithKeypair(transaction, keypair),
  } as Wallet;

  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

export function canSubmitTransactions(
  mode: WalletMode,
  wallet: BrowserWalletLike | null,
  localKeypair: Keypair | null
) {
  if (mode === "browser-wallet") return !!wallet?.publicKey;
  if (mode === "local-keypair") return !!localKeypair?.publicKey;
  return false;
}

export function describeWalletMode(mode: WalletMode) {
  if (mode === "browser-wallet") {
    return "Browser wallet mode supports real transactions via Phantom-compatible providers.";
  }
  if (mode === "local-keypair") {
    return "Local keypair mode signs in-browser with a pasted Solana CLI secret key and is intended for localnet debugging only.";
  }
  return "Scout mode is read-only in the browser and is intended for safe environment verification.";
}
