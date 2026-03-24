import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { program, programId, rpcUrl, wallet } from "./anchor_env";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "./ids";
import {
  associatedTokenAddress,
  likePda,
  masterEditionPda,
  metadataPda,
  nftMintPda,
  profilePda,
  rewardConfigPda,
  tokenMintPda,
  tweetPda,
} from "./pda";

async function ensureProfile(user: anchor.web3.Keypair, name: string) {
  const profile = profilePda(user.publicKey);
  const info = await program.provider.connection.getAccountInfo(profile);
  if (!info) {
    const sig = await program.provider.connection.requestAirdrop(
      user.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await program.provider.connection.confirmTransaction(sig, "confirmed");
    await program.methods
      .createProfile(name, `${name}-bio`, `https://example.com/${name}.png`)
      .accounts({ authority: user.publicKey })
      .signers([user])
      .rpc();
  }
  return profile;
}

async function main() {
  console.log("rpc_url", rpcUrl);
  console.log("program_id", programId.toBase58());
  console.log("author", wallet.publicKey.toBase58());

  const liker = anchor.web3.Keypair.generate();
  const likerAirdrop = await program.provider.connection.requestAirdrop(
    liker.publicKey,
    anchor.web3.LAMPORTS_PER_SOL
  );
  await program.provider.connection.confirmTransaction(likerAirdrop, "confirmed");

  const profile = await ensureProfile(wallet, "author");
  const likerProfile = await ensureProfile(liker, "liker");

  const rewardConfig = rewardConfigPda();
  const nftMint = nftMintPda(rewardConfig, profile);
  const nftAta = associatedTokenAddress(nftMint, wallet.publicKey);
  const nftMetadata = metadataPda(nftMint);
  const nftMasterEdition = masterEditionPda(nftMint);
  const tokenMint = tokenMintPda();
  const tokenMetadata = metadataPda(tokenMint);

  const rewardConfigInfo =
    await program.provider.connection.getAccountInfo(rewardConfig);
  if (!rewardConfigInfo) {
    const tx = await program.methods
      .initRewardConfig(
        "10 Tweets Badge",
        "TWEET10",
        "https://example.com/nft",
        10,
        new BN(100),
        new BN(0),
        new BN(200),
        10,
        10,
        5,
        1
      )
      .accountsStrict({
        authority: wallet.publicKey,
        rewardConfig,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();
    console.log("init_reward_config_tx", tx);
  }

  const nftMintInfo = await program.provider.connection.getAccountInfo(nftMint);
  if (!nftMintInfo) {
    const tx = await program.methods
      .createNftMint()
      .accountsStrict({
        authority: wallet.publicKey,
        profile,
        rewardConfig,
        nftMintAccount: nftMint,
        nftAssociatedTokenAccount: nftAta,
        metadataAccount: nftMetadata,
        masterEditonAccount: nftMasterEdition,
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

  const tokenMintInfo = await program.provider.connection.getAccountInfo(tokenMint);
  if (!tokenMintInfo) {
    const tx = await program.methods
      .createTokenMint()
      .accountsStrict({
        authority: wallet.publicKey,
        tokenMintAccount: tokenMint,
        metadataAccount: tokenMetadata,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([wallet])
      .rpc();
    console.log("create_token_mint_tx", tx);
  }

  const authorProfileAccount = await program.account.profile.fetch(profile);
  const tweet = tweetPda(profile, authorProfileAccount.tweetCount);
  const tweetInfo = await program.provider.connection.getAccountInfo(tweet);
  if (!tweetInfo) {
    const tx = await program.methods
      .createTweet("app tweet")
      .accountsStrict({
        authority: wallet.publicKey,
        tweet,
        profile,
        nftMintAccount: nftMint,
        rewardConfig,
        authorNftAccount: nftAta,
        masterEditonAccount: nftMasterEdition,
        metadataAccount: nftMetadata,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([wallet])
      .rpc();
    console.log("create_tweet_tx", tx);
  }

  const like = likePda(tweet, likerProfile);
  const likeInfo = await program.provider.connection.getAccountInfo(like);
  if (!likeInfo) {
    const tx = await program.methods
      .createLike()
      .accountsStrict({
        authority: liker.publicKey,
        tweet,
        profile: likerProfile,
        like,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([liker])
      .rpc();
    console.log("create_like_tx", tx);
  }

  const authorTokenAccount = associatedTokenAddress(tokenMint, wallet.publicKey);
  const rewardTx = await program.methods
    .mintLikeReward()
    .accountsStrict({
      authority: liker.publicKey,
      tweet,
      profile: likerProfile,
      like,
      authorProfile: profile,
      rewardConfig,
      tokenMintAccount: tokenMint,
      authorTokenAccount,
      author: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([liker])
    .rpc();

  console.log("mint_like_reward_tx", rewardTx);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
