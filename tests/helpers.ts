import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import { Social } from "../target/types/social";

export const provider = AnchorProvider.env();
anchor.setProvider(provider);

export const program = anchor.workspace.social as Program<Social>;
export const { SystemProgram, Keypair, PublicKey } = web3;
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
export const SYSVAR_RENT_PUBKEY = web3.SYSVAR_RENT_PUBKEY;

export async function airdrop(pubkey: web3.PublicKey, sol = 1) {
  const sig = await provider.connection.requestAirdrop(
    pubkey,
    sol * web3.LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(sig, "confirmed");
}

export function profilePda(authority: web3.PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), authority.toBuffer()],
    program.programId
  )[0];
}

function u32ToLeBytes(value: number) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return buf;
}

export function tweetPda(profile: web3.PublicKey, tweetCount: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("tweet"), profile.toBuffer(), u32ToLeBytes(tweetCount)],
    program.programId
  )[0];
}

export function likePda(tweet: web3.PublicKey, profile: web3.PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("like"), tweet.toBuffer(), profile.toBuffer()],
    program.programId
  )[0];
}

export function nftMintPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    program.programId
  )[0];
}

export function metadataPda(mint: web3.PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
}

export function associatedTokenAddress(
  mint: web3.PublicKey,
  owner: web3.PublicKey,
  tokenProgramId: web3.PublicKey = TOKEN_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}
