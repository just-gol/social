import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { resolve } from "path";

function expandHome(path: string) {
  if (path.startsWith("~")) {
    const home = process.env.HOME || "";
    return path.replace("~", home);
  }
  return path;
}

function loadKeypair(path: string) {
  const bytes = JSON.parse(readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

export const rpcUrl =
  process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
const walletPath = expandHome(
  process.env.ANCHOR_WALLET || "~/.config/solana/id.json"
);

export const connection = new Connection(rpcUrl, "confirmed");
export const wallet = loadKeypair(walletPath);
export const provider = new AnchorProvider(
  connection,
  new anchor.Wallet(wallet),
  {
    commitment: "confirmed",
  }
);
anchor.setProvider(provider);

const idl = JSON.parse(
  readFileSync(resolve(__dirname, "../target/idl/social.json"), "utf8")
);
export const programId = new PublicKey(idl.address);
export const program = new anchor.Program(idl, provider);
