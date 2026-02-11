import * as anchor from "@coral-xyz/anchor";
import { program, programId, rpcUrl, wallet } from "./anchor_env";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
  TOKEN_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
} from "./ids";
import {
  associatedTokenAddress,
  likePda,
  nftMintPda,
  profilePda,
  tweetPda,
  metadataPda,
} from "./pda";

async function main() {
  console.log("rpc_url", rpcUrl);
  console.log("program_id", programId.toBase58());
  console.log("authority", wallet.publicKey.toBase58());

  const profile = profilePda(wallet.publicKey);
  const profileInfo = await program.provider.connection.getAccountInfo(profile);
  if (!profileInfo) {
    const tx = await program.methods
      .createProfile("app_user")
      .accounts({
        authority: wallet.publicKey,
      })
      .signers([wallet])
      .rpc();
    console.log("create_profile_tx", tx);
  }

  const mint = nftMintPda();
  const mintInfo = await program.provider.connection.getAccountInfo(mint);
  if (!mintInfo) {
    const ata = associatedTokenAddress(mint, wallet.publicKey);
    const metadata = metadataPda(mint);
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
    console.log("create_nft_mint_tx", tx);
  }

  const profileAccount = await program.account.profile.fetch(profile);
  const tweet = tweetPda(profile, profileAccount.tweetCount);
  const tweetInfo = await program.provider.connection.getAccountInfo(tweet);
  if (!tweetInfo) {
    const tx = await program.methods
      .createTweet("app tweet")
      .accountsStrict({
        authority: wallet.publicKey,
        tweet,
        profile,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();
    console.log("create_tweet_tx", tx);
  }

  const like = likePda(tweet, profile);
  const authorTokenAccount = associatedTokenAddress(mint, wallet.publicKey);
  const tx = await program.methods
    .createLike()
    .accountsStrict({
      authority: wallet.publicKey,
      tweet,
      profile,
      like,
      nftMintAccount: mint,
      authorTokenAccount,
      authorWallet: wallet.publicKey,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([wallet])
    .rpc();

  console.log("create_like_tx", tx);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
