import * as anchor from "@coral-xyz/anchor";
import { program, programId, rpcUrl, wallet } from "./anchor_env";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "./ids";
import { associatedTokenAddress, metadataPda, nftMintPda } from "./pda";

async function main() {
  const mint = nftMintPda();
  const ata = associatedTokenAddress(mint, wallet.publicKey);
  const metadata = metadataPda(mint);

  console.log("rpc_url", rpcUrl);
  console.log("program_id", programId.toBase58());
  console.log("nft_mint_pda", mint.toBase58());
  console.log("nft_ata", ata.toBase58());
  console.log("metadata_pda", metadata.toBase58());

  const tx = await program.methods
    .createNftMint()
    .accountsStrict({
      authority: wallet.publicKey,
      nftMintAccount: mint,
      nftAssociatedTokenAccount: ata,
      metadataAccount: metadata,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([wallet])
    .rpc();

  console.log("tx", tx);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
