import { expect } from "chai";
import {
  program,
  Keypair,
  SystemProgram,
  airdrop,
  profilePda,
  tweetPda,
  likePda,
  rewardConfigPda,
  nftMintPda,
  tokenMintPda,
  metadataPda,
  masterEditionPda,
  associatedTokenAddress,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
} from "./helpers";

async function createProfile(authority: any, name = "user") {
  const profile = profilePda(authority.publicKey);
  await program.methods
    .createProfile(name)
    .accounts({
      authority: authority.publicKey,
    })
    .signers([authority])
    .rpc();
  return profile;
}

async function initRewardConfig(authority: any) {
  const rewardConfig = rewardConfigPda(authority.publicKey);
  await program.methods
    .initRewardConfig("10 Tweets Badge", "TWEET10", "https://example.com/nft")
    .accountsStrict({
      authority: authority.publicKey,
      rewardConfig,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc();
  return rewardConfig;
}

async function createNftMintFor(authority: any, profile: any, rewardConfig: any) {
  const mint = nftMintPda(rewardConfig, profile);
  const ata = associatedTokenAddress(mint, authority.publicKey, TOKEN_PROGRAM_ID);
  const metadata = metadataPda(mint);
  const masterEdition = masterEditionPda(mint);

  await program.methods
    .createNftMint()
    .accountsStrict({
      authority: authority.publicKey,
      profile,
      rewardConfig,
      nftMintAccount: mint,
      nftAssociatedTokenAccount: ata,
      metadataAccount: metadata,
      masterEditonAccount: masterEdition,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([authority])
    .rpc();

  return { mint, ata };
}

async function createTokenMint(authority: any) {
  const tokenMint = tokenMintPda();
  const metadata = metadataPda(tokenMint);

  await program.methods
    .createTokenMint()
    .accountsStrict({
      authority: authority.publicKey,
      tokenMintAccount: tokenMint,
      metadataAccount: metadata,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([authority])
    .rpc();

  return tokenMint;
}

async function createTweetFor(
  authority: any,
  profile: any,
  rewardConfig: any,
  mint: any,
  content: string
) {
  const profileAccount = await program.account.profile.fetch(profile);
  const tweet = tweetPda(profile, profileAccount.tweetCount);
  const authorNftAccount = associatedTokenAddress(
    mint,
    authority.publicKey,
    TOKEN_PROGRAM_ID
  );

  await program.methods
    .createTweet(content)
    .accountsStrict({
      authority: authority.publicKey,
      tweet,
      profile,
      nftMintAccount: mint,
      rewardConfig,
      authorNftAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return tweet;
}

describe("like", () => {
  it("creates like and increments tweet likes_count", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = await createProfile(authority);
    const rewardConfig = await initRewardConfig(authority);
    const { mint } = await createNftMintFor(authority, profile, rewardConfig);
    const tweet = await createTweetFor(
      authority,
      profile,
      rewardConfig,
      mint,
      "first tweet"
    );

    const like = likePda(tweet, profile);
    await program.methods
      .createLike()
      .accountsStrict({
        authority: authority.publicKey,
        tweet,
        profile,
        like,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const tweetAccount = await program.account.tweet.fetch(tweet);
    expect(tweetAccount.likesCount).to.equal(1);

    const likeAccount = await program.account.like.fetch(like);
    expect(likeAccount.profilePda.toBase58()).to.equal(profile.toBase58());
    expect(likeAccount.tweetPda.toBase58()).to.equal(tweet.toBase58());
    expect(likeAccount.rewardClaimed).to.equal(false);
  });

  it("mints reward token to tweet author and blocks double claim", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const author = Keypair.generate();
    const liker = Keypair.generate();
    await airdrop(author.publicKey);
    await airdrop(liker.publicKey);

    const tokenMint = await createTokenMint(liker);
    const authorProfile = await createProfile(author, "author");
    const likerProfile = await createProfile(liker, "liker");
    const authorRewardConfig = await initRewardConfig(author);
    const { mint: authorNftMint } = await createNftMintFor(
      author,
      authorProfile,
      authorRewardConfig
    );

    const tweet = await createTweetFor(
      author,
      authorProfile,
      authorRewardConfig,
      authorNftMint,
      "rewardable tweet"
    );

    const like = likePda(tweet, likerProfile);
    await program.methods
      .createLike()
      .accountsStrict({
        authority: liker.publicKey,
        tweet,
        profile: likerProfile,
        like,
        systemProgram: SystemProgram.programId,
      })
      .signers([liker])
      .rpc();

    const authorTokenAccount = associatedTokenAddress(
      tokenMint,
      author.publicKey,
      TOKEN_PROGRAM_ID
    );

    await program.methods
      .mintLikeReward()
      .accountsStrict({
        authority: liker.publicKey,
        tweet,
        profile: likerProfile,
        like,
        tokenMintAccount: tokenMint,
        authorTokenAccount,
        author: author.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([liker])
      .rpc();

    const likeAccount = await program.account.like.fetch(like);
    expect(likeAccount.rewardClaimed).to.equal(true);

    const balance = await program.provider.connection.getTokenAccountBalance(
      authorTokenAccount
    );
    expect(balance.value.amount).to.equal("1");

    try {
      await program.methods
        .mintLikeReward()
        .accountsStrict({
          authority: liker.publicKey,
          tweet,
          profile: likerProfile,
          like,
          tokenMintAccount: tokenMint,
          authorTokenAccount,
          author: author.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([liker])
        .rpc();
      expect.fail("second reward claim should fail");
    } catch (error) {
      expect(`${error}`).to.include("Reward already claimed");
    }
  });
});
