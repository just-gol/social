import * as anchor from "@coral-xyz/anchor";
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
  DEFAULT_REWARD_CONFIG,
} from "./helpers";

async function getMintTokenProgram(mint: anchor.web3.PublicKey) {
  const info = await program.provider.connection.getAccountInfo(mint);
  if (!info) {
    throw new Error(`mint not found: ${mint.toBase58()}`);
  }
  return info.owner;
}

async function createProfile(authority: any, name = "user") {
  const profile = profilePda(authority.publicKey);
  await program.methods
    .createProfile(name, `${name}-bio`, `https://example.com/${name}.png`)
    .accounts({
      authority: authority.publicKey,
    })
    .signers([authority])
    .rpc();

  return profile;
}

async function initRewardConfig(authority: any, overrides = {}) {
  const admin = (program.provider.wallet as any).payer;
  const rewardConfig = rewardConfigPda();
  const config = { ...DEFAULT_REWARD_CONFIG, ...overrides };
  const exists = await program.provider.connection.getAccountInfo(rewardConfig);
  const builder = exists
    ? program.methods.updateRewardConfig(
        "10 Tweets Badge",
        "TWEET10",
        "https://example.com/nft",
        config.milestoneTweetCount,
        new anchor.BN(config.likeRewardAmount),
        new anchor.BN(config.stakeBaseRewardAmount),
        new anchor.BN(config.stakeRewardPerEpoch),
        config.dailyTweetRewardCap,
        config.dailyLikeRewardCap,
        config.maxRewardableLikesPerTweet,
        config.minTweetsBeforeLikeReward
      )
    : program.methods.initRewardConfig(
        "10 Tweets Badge",
        "TWEET10",
        "https://example.com/nft",
        config.milestoneTweetCount,
        new anchor.BN(config.likeRewardAmount),
        new anchor.BN(config.stakeBaseRewardAmount),
        new anchor.BN(config.stakeRewardPerEpoch),
        config.dailyTweetRewardCap,
        config.dailyLikeRewardCap,
        config.maxRewardableLikesPerTweet,
        config.minTweetsBeforeLikeReward
      );
  await builder
    .accountsStrict({
      authority: admin.publicKey,
      rewardConfig,
      ...(exists ? {} : { systemProgram: SystemProgram.programId }),
    } as any)
    .signers([admin])
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

  await program.methods
    .createTweet(content)
    .accountsStrict({
      authority: authority.publicKey,
      tweet,
      profile,
      nftMintAccount: mint,
      rewardConfig,
      authorNftAccount: associatedTokenAddress(
        mint,
        authority.publicKey,
        TOKEN_PROGRAM_ID
      ),
      masterEditonAccount: masterEditionPda(mint),
      metadataAccount: metadataPda(mint),
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
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

    const author = Keypair.generate();
    const liker = Keypair.generate();
    await airdrop(author.publicKey);
    await airdrop(liker.publicKey);

    const authorProfile = await createProfile(author, "author");
    const likerProfile = await createProfile(liker, "liker");
    const rewardConfig = await initRewardConfig(author);
    const { mint } = await createNftMintFor(author, authorProfile, rewardConfig);
    const tweet = await createTweetFor(
      author,
      authorProfile,
      rewardConfig,
      mint,
      "first tweet"
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

    const tweetAccount = await program.account.tweet.fetch(tweet);
    expect(tweetAccount.likesCount).to.equal(1);

    const likeAccount = await program.account.like.fetch(like);
    expect(likeAccount.profilePda.toBase58()).to.equal(likerProfile.toBase58());
    expect(likeAccount.tweetPda.toBase58()).to.equal(tweet.toBase58());
    expect(likeAccount.rewardClaimed).to.equal(false);
    expect(Number(likeAccount.createdAt)).to.be.greaterThan(0);
    expect(mint).to.exist;
  });

  it("blocks self-like", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const author = Keypair.generate();
    await airdrop(author.publicKey);

    const authorProfile = await createProfile(author, "author");
    const rewardConfig = await initRewardConfig(author);
    const { mint } = await createNftMintFor(author, authorProfile, rewardConfig);
    const tweet = await createTweetFor(
      author,
      authorProfile,
      rewardConfig,
      mint,
      "self-like tweet"
    );
    const like = likePda(tweet, authorProfile);

    try {
      await program.methods
        .createLike()
        .accountsStrict({
          authority: author.publicKey,
          tweet,
          profile: authorProfile,
          like,
          systemProgram: SystemProgram.programId,
        })
        .signers([author])
        .rpc();
      expect.fail("self like should fail");
    } catch (error) {
      expect(`${error}`).to.include("Self like is not allowed");
    }
  });

  it("mints configurable reward to tweet author and blocks double claim", async function () {
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
    const { mint: authorMint } = await createNftMintFor(
      author,
      authorProfile,
      authorRewardConfig
    );
    const tweet = await createTweetFor(
      author,
      authorProfile,
      authorRewardConfig,
      authorMint,
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
      await getMintTokenProgram(tokenMint)
    );
    const tokenProgram = await getMintTokenProgram(tokenMint);

    await program.methods
      .mintLikeReward()
      .accountsStrict({
        authority: author.publicKey,
        tweet,
        authorProfile,
        like,
        likerProfile: likerProfile,
        rewardConfig: authorRewardConfig,
        tokenMintAccount: tokenMint,
        authorityTokenAccount: authorTokenAccount,
        tokenProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([author])
      .rpc();

    const likeAccount = await program.account.like.fetch(like);
    expect(likeAccount.rewardClaimed).to.equal(true);

    const balance = await program.provider.connection.getTokenAccountBalance(
      authorTokenAccount
    );
    expect(balance.value.amount).to.equal(
      DEFAULT_REWARD_CONFIG.likeRewardAmount.toString()
    );

    const updatedAuthorProfile = await program.account.profile.fetch(authorProfile);
    expect(updatedAuthorProfile.tokenRewardsEarned.toString()).to.equal(
      DEFAULT_REWARD_CONFIG.likeRewardAmount.toString()
    );

    try {
      await program.methods
        .mintLikeReward()
        .accountsStrict({
          authority: author.publicKey,
          tweet,
          authorProfile,
          like,
          likerProfile: likerProfile,
          rewardConfig: authorRewardConfig,
          tokenMintAccount: tokenMint,
          authorityTokenAccount: authorTokenAccount,
          tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([author])
        .rpc();
      expect.fail("second reward claim should fail");
    } catch (error) {
      expect(`${error}`).to.include("Reward already claimed");
    }
  });

  it("enforces like reward caps and deleted tweet restrictions", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const author = Keypair.generate();
    const likerOne = Keypair.generate();
    const likerTwo = Keypair.generate();
    await Promise.all([
      airdrop(author.publicKey),
      airdrop(likerOne.publicKey),
      airdrop(likerTwo.publicKey),
    ]);

    const authorProfile = await createProfile(author, "author");
    const rewardConfig = await initRewardConfig(author, {
      dailyLikeRewardCap: 10,
      maxRewardableLikesPerTweet: 1,
      minTweetsBeforeLikeReward: 2,
      milestoneTweetCount: 99,
    });
    const { mint } = await createNftMintFor(author, authorProfile, rewardConfig);
    const tokenMint = await createTokenMint(likerOne);
    const tokenProgram = await getMintTokenProgram(tokenMint);
    const authorTokenAccount = associatedTokenAddress(
      tokenMint,
      author.publicKey,
      tokenProgram
    );
    await createTweetFor(author, authorProfile, rewardConfig, mint, "bootstrap-1");
    await createTweetFor(author, authorProfile, rewardConfig, mint, "bootstrap-2");
    const tweet = await createTweetFor(author, authorProfile, rewardConfig, mint, "rewardable");

    const likerOneProfile = await createProfile(likerOne, "liker-one");
    const likeOne = likePda(tweet, likerOneProfile);
    await program.methods
      .createLike()
      .accountsStrict({
        authority: likerOne.publicKey,
        tweet,
        profile: likerOneProfile,
        like: likeOne,
        systemProgram: SystemProgram.programId,
      })
      .signers([likerOne])
      .rpc();

    await program.methods
      .mintLikeReward()
      .accountsStrict({
        authority: author.publicKey,
        tweet,
        authorProfile,
        like: likeOne,
        likerProfile: likerOneProfile,
        rewardConfig,
        tokenMintAccount: tokenMint,
        authorityTokenAccount: authorTokenAccount,
        tokenProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([author])
      .rpc();

    const likerTwoProfile = await createProfile(likerTwo, "liker-two");
    const likeTwo = likePda(tweet, likerTwoProfile);
    await program.methods
      .createLike()
      .accountsStrict({
        authority: likerTwo.publicKey,
        tweet,
        profile: likerTwoProfile,
        like: likeTwo,
        systemProgram: SystemProgram.programId,
      })
      .signers([likerTwo])
      .rpc();

    try {
      await program.methods
        .mintLikeReward()
        .accountsStrict({
          authority: author.publicKey,
          tweet,
          authorProfile,
          like: likeTwo,
          likerProfile: likerTwoProfile,
          rewardConfig,
          tokenMintAccount: tokenMint,
          authorityTokenAccount: authorTokenAccount,
          tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([author])
        .rpc();
      expect.fail("tweet reward cap should fail");
    } catch (error) {
      expect(`${error}`).to.include("Tweet reward cap exceeded");
    }

    await program.methods
      .deleteTweet()
      .accountsStrict({
        authority: author.publicKey,
        tweet,
        profile: authorProfile,
      })
      .signers([author])
      .rpc();

    const likerThree = Keypair.generate();
    await airdrop(likerThree.publicKey);
    const likerThreeProfile = await createProfile(likerThree, "liker-three");
    const likeThree = likePda(tweet, likerThreeProfile);

    try {
      await program.methods
        .createLike()
        .accountsStrict({
          authority: likerThree.publicKey,
          tweet,
          profile: likerThreeProfile,
          like: likeThree,
          systemProgram: SystemProgram.programId,
        })
        .signers([likerThree])
        .rpc();
      expect.fail("deleted tweet should not be likeable");
    } catch (error) {
      expect(`${error}`).to.include("Tweet has been deleted");
    }
  });
});
