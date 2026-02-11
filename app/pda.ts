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
