import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  program,
  Keypair,
  SystemProgram,
  airdrop,
  profilePda,
  rewardConfigPda,
  tweetPda,
  nftMintPda,
  metadataPda,
  masterEditionPda,
  associatedTokenAddress,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
  DEFAULT_REWARD_CONFIG,
} from "./helpers";

async function createProfile(authority: any, name = "alice") {
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
  const builder = program.methods[
    (
      (await program.provider.connection.getAccountInfo(rewardConfig))
        ? "updateRewardConfig"
        : "initRewardConfig"
    ) as "initRewardConfig" | "updateRewardConfig"
  ](
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
      ...(await program.provider.connection.getAccountInfo(rewardConfig)
        ? {}
        : { systemProgram: SystemProgram.programId }),
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

describe("tweet", () => {
  it("creates tweet, stores timestamp, and increments profile tweet_count", async function () {
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

    const before = await program.account.profile.fetch(profile);
    const tweet = tweetPda(profile, before.tweetCount);
    const metadata = metadataPda(mint);
    const masterEdition = masterEditionPda(mint);

    await program.methods
      .createTweet("hello world")
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
        masterEditonAccount: masterEdition,
        metadataAccount: metadata,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    const after = await program.account.profile.fetch(profile);
    expect(after.tweetCount).to.equal(before.tweetCount + 1);

    const tweetAccount = await program.account.tweet.fetch(tweet);
    expect(tweetAccount.content).to.equal("hello world");
    expect(tweetAccount.author.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(tweetAccount.deleted).to.equal(false);
    expect(tweetAccount.commentsCount).to.equal(0);
    expect(Number(tweetAccount.createdAt)).to.be.greaterThan(0);
  });

  it("mints nft reward on the configured milestone tweet", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = await createProfile(authority, "milestone");
    const rewardConfig = await initRewardConfig(authority, {
      milestoneTweetCount: 3,
      dailyTweetRewardCap: 5,
    });
    const { mint, ata } = await createNftMintFor(authority, profile, rewardConfig);

    const metadata = metadataPda(mint);
    const masterEdition = masterEditionPda(mint);

    for (let i = 0; i < 3; i += 1) {
      const profileAccount = await program.account.profile.fetch(profile);
      const tweet = tweetPda(profile, profileAccount.tweetCount);

      await program.methods
        .createTweet(`tweet-${i}`)
        .accountsStrict({
          authority: authority.publicKey,
          tweet,
          profile,
          nftMintAccount: mint,
          rewardConfig,
          authorNftAccount: ata,
          masterEditonAccount: masterEdition,
          metadataAccount: metadata,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();
    }

    const afterProfile = await program.account.profile.fetch(profile);
    expect(afterProfile.tweetCount).to.equal(3);
    expect(afterProfile.nftRewardsEarned).to.equal(1);

    const afterBalance = await program.provider.connection.getTokenAccountBalance(ata);
    expect(Number(afterBalance.value.amount)).to.equal(1);
  });

  it("fails when the daily tweet cap is exceeded", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = await createProfile(authority, "capped");
    const rewardConfig = await initRewardConfig(authority, {
      dailyTweetRewardCap: 1,
      milestoneTweetCount: 99,
    });
    const { mint, ata } = await createNftMintFor(authority, profile, rewardConfig);
    const metadata = metadataPda(mint);
    const masterEdition = masterEditionPda(mint);

    for (let i = 0; i < 1; i += 1) {
      const profileAccount = await program.account.profile.fetch(profile);
      const tweet = tweetPda(profile, profileAccount.tweetCount);
      await program.methods
        .createTweet(`tweet-${i}`)
        .accountsStrict({
          authority: authority.publicKey,
          tweet,
          profile,
          nftMintAccount: mint,
          rewardConfig,
          authorNftAccount: ata,
          masterEditonAccount: masterEdition,
          metadataAccount: metadata,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();
    }

    const tweet = tweetPda(profile, 1);
    try {
      await program.methods
        .createTweet("tweet-1")
        .accountsStrict({
          authority: authority.publicKey,
          tweet,
          profile,
          nftMintAccount: mint,
          rewardConfig,
          authorNftAccount: ata,
          masterEditonAccount: masterEdition,
          metadataAccount: metadata,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();
      expect.fail("expected daily cap failure");
    } catch (error) {
      expect(`${error}`).to.include("Daily tweet cap exceeded");
    }
  });

  it("soft deletes a tweet", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = await createProfile(authority, "deleter");
    const rewardConfig = await initRewardConfig(authority);
    const { mint } = await createNftMintFor(authority, profile, rewardConfig);

    const tweet = tweetPda(profile, 0);
    await program.methods
      .createTweet("delete me")
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

    await program.methods
      .deleteTweet()
      .accountsStrict({
        authority: authority.publicKey,
        tweet,
        profile,
      })
      .signers([authority])
      .rpc();

    const tweetAccount = await program.account.tweet.fetch(tweet);
    expect(tweetAccount.deleted).to.equal(true);
    expect(tweetAccount.commentsCount).to.equal(0);
  });
});
