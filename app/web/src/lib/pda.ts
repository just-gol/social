import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "./constants";

const programId = new PublicKey(PROGRAM_ID);
const associatedTokenProgramId = new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
const tokenMetadataProgramId = new PublicKey(TOKEN_METADATA_PROGRAM_ID);
const tokenProgramId = new PublicKey(TOKEN_PROGRAM_ID);

function u32ToLeBytes(value: number) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return buf;
}

export function profilePda(authority: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), authority.toBuffer()],
    programId
  )[0];
}

export function rewardConfigPda() {
  return PublicKey.findProgramAddressSync([Buffer.from("reward_config")], programId)[0];
}

export function tweetPda(profile: PublicKey, tweetCount: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("tweet"), profile.toBuffer(), u32ToLeBytes(tweetCount)],
    programId
  )[0];
}

export function likePda(tweet: PublicKey, profile: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("like"), tweet.toBuffer(), profile.toBuffer()],
    programId
  )[0];
}

export function nftMintPda(rewardConfig: PublicKey, profile: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("nft_mint"), rewardConfig.toBuffer(), profile.toBuffer()],
    programId
  )[0];
}

export function tokenMintPda() {
  return PublicKey.findProgramAddressSync([Buffer.from("token_mint")], programId)[0];
}

export function stakePda(authority: PublicKey, nftMint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), authority.toBuffer(), nftMint.toBuffer()],
    programId
  )[0];
}

export function associatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  tokenProgram: PublicKey = tokenProgramId
) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId
  )[0];
}

export function metadataPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), tokenMetadataProgramId.toBuffer(), mint.toBuffer()],
    tokenMetadataProgramId
  )[0];
}

export function masterEditionPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      tokenMetadataProgramId.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    tokenMetadataProgramId
  )[0];
}
