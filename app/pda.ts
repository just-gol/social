import { PublicKey } from "@solana/web3.js";
import { program } from "./anchor_env";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "./ids";

export function nftMintPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    program.programId
  )[0];
}

export function profilePda(authority: PublicKey) {
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

export function tweetPda(profile: PublicKey, tweetCount: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("tweet"), profile.toBuffer(), u32ToLeBytes(tweetCount)],
    program.programId
  )[0];
}

export function likePda(tweet: PublicKey, profile: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("like"), tweet.toBuffer(), profile.toBuffer()],
    program.programId
  )[0];
}

export function associatedTokenAddress(mint: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export function metadataPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
}
