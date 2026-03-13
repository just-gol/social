import * as anchor from "@coral-xyz/anchor";
import { program, programId, rpcUrl, wallet } from "./anchor_env";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "./ids";
import {
  associatedTokenAddress,
  masterEditionPda,
  metadataPda,
  nftMintPda,
  profilePda,
  rewardConfigPda,
} from "./pda";

async function main() {
  const profile = profilePda(wallet.publicKey);
  const rewardConfig = rewardConfigPda(wallet.publicKey);
  const mint = nftMintPda(rewardConfig, profile);
  const ata = associatedTokenAddress(mint, wallet.publicKey);
  const metadata = metadataPda(mint);
  const masterEdition = masterEditionPda(mint);

  console.log("rpc_url", rpcUrl);
  console.log("program_id", programId.toBase58());
  console.log("profile_pda", profile.toBase58());
  console.log("reward_config_pda", rewardConfig.toBase58());
  console.log("nft_mint_pda", mint.toBase58());
  console.log("nft_ata", ata.toBase58());
  console.log("metadata_pda", metadata.toBase58());

  const profileInfo = await program.provider.connection.getAccountInfo(profile);
  if (!profileInfo) {
    const tx = await program.methods
      .createProfile("app_user")
      .accounts({ authority: wallet.publicKey })
      .signers([wallet])
      .rpc();
    console.log("create_profile_tx", tx);
  }

  const rewardConfigInfo =
    await program.provider.connection.getAccountInfo(rewardConfig);
  if (!rewardConfigInfo) {
    const tx = await program.methods
      .initRewardConfig("10 Tweets Badge", "TWEET10", "https://example.com/nft")
      .accountsStrict({
        authority: wallet.publicKey,
        rewardConfig,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();
    console.log("init_reward_config_tx", tx);
  }

  const tx = await program.methods
    .createNftMint()
    .accountsStrict({
      authority: wallet.publicKey,
      profile,
      rewardConfig,
      nftMintAccount: mint,
      nftAssociatedTokenAccount: ata,
      metadataAccount: metadata,
      masterEditonAccount: masterEdition,
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
