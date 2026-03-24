import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
  program,
  Keypair,
  SystemProgram,
  airdrop,
  profilePda,
  rewardConfigPda,
  tokenMintPda,
  nftMintPda,
  tweetPda,
  metadataPda,
  masterEditionPda,
  associatedTokenAddress,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
  DEFAULT_REWARD_CONFIG,
} from "./helpers";

function stakePda(authority: PublicKey, mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), authority.toBuffer(), mint.toBuffer()],
    program.programId
  )[0];
}

async function createProfile(authority: any, name = "staker") {
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

async function createNftMint(authority: any, profile: PublicKey, rewardConfig: PublicKey) {
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

async function createTweet(
  authority: any,
  profile: PublicKey,
  rewardConfig: PublicKey,
  mint: PublicKey,
  ata: PublicKey,
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
      authorNftAccount: ata,
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

async function setupStakeFixture(authority: any, name = "staker", configOverrides = {}) {
  const profile = await createProfile(authority, name);
  const rewardConfig = await initRewardConfig(authority, configOverrides);
  const tokenMint = await createTokenMint(authority);
  const { mint, ata: authorityNftAccount } = await createNftMint(
    authority,
    profile,
    rewardConfig
  );

  let lastTweet = PublicKey.default;
  for (let i = 0; i < 10; i += 1) {
    lastTweet = await createTweet(
      authority,
      profile,
      rewardConfig,
      mint,
      authorityNftAccount,
      `${name}-tweet-${i}`
    );
  }

  const stake = stakePda(authority.publicKey, mint);
  const stakeAssociatedTokenAccount = associatedTokenAddress(
    mint,
    stake,
    TOKEN_PROGRAM_ID
  );
  const authorityTokenAccount = associatedTokenAddress(
    tokenMint,
    authority.publicKey,
    TOKEN_PROGRAM_ID
  );

  return {
    profile,
    rewardConfig,
    tokenMint,
    mint,
    lastTweet,
    stake,
    stakeAssociatedTokenAccount,
    authorityNftAccount,
    authorityTokenAccount,
  };
}

async function createStakePosition(authority: any, name = "staker", configOverrides = {}) {
  const fixture = await setupStakeFixture(authority, name, configOverrides);

  await program.methods
    .createStake()
    .accountsStrict({
      authority: authority.publicKey,
      stake: fixture.stake,
      tweet: fixture.lastTweet,
      profile: fixture.profile,
      nftMintAccount: fixture.mint,
      stakeAssociatedTokenAccount: fixture.stakeAssociatedTokenAccount,
      authorityNftAccount: fixture.authorityNftAccount,
      rewardConfig: fixture.rewardConfig,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([authority])
    .rpc();

  return fixture;
}

describe("stake", () => {
  it("transfers nft into stake ata on stake", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const authority = Keypair.generate();
    await airdrop(authority.publicKey, 2);

    const fixture = await setupStakeFixture(authority);
    const authorityNftBalanceBefore =
      await program.provider.connection.getTokenAccountBalance(
        fixture.authorityNftAccount
      );
    expect(authorityNftBalanceBefore.value.amount).to.equal("1");

    await program.methods
      .createStake()
      .accountsStrict({
        authority: authority.publicKey,
        stake: fixture.stake,
        tweet: fixture.lastTweet,
        profile: fixture.profile,
        nftMintAccount: fixture.mint,
        stakeAssociatedTokenAccount: fixture.stakeAssociatedTokenAccount,
        authorityNftAccount: fixture.authorityNftAccount,
        rewardConfig: fixture.rewardConfig,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    const authorityNftBalanceAfter =
      await program.provider.connection.getTokenAccountBalance(
        fixture.authorityNftAccount
      );
    expect(authorityNftBalanceAfter.value.amount).to.equal("0");

    const stakeNftBalance = await program.provider.connection.getTokenAccountBalance(
      fixture.stakeAssociatedTokenAccount
    );
    expect(stakeNftBalance.value.amount).to.equal("1");
  });

  it("rejects staking when the tweet does not belong to the staking authority", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const staker = Keypair.generate();
    const poster = Keypair.generate();
    await airdrop(staker.publicKey, 2);
    await airdrop(poster.publicKey, 2);

    const stakerFixture = await setupStakeFixture(staker, "staker");
    const posterProfile = await createProfile(poster, "poster");
    const posterRewardConfig = await initRewardConfig(poster);
    const { mint: posterMint, ata: posterNftAccount } = await createNftMint(
      poster,
      posterProfile,
      posterRewardConfig
    );
    const posterTweet = await createTweet(
      poster,
      posterProfile,
      posterRewardConfig,
      posterMint,
      posterNftAccount,
      "poster-tweet"
    );

    try {
      await program.methods
        .createStake()
        .accountsStrict({
          authority: staker.publicKey,
          stake: stakerFixture.stake,
          tweet: posterTweet,
          profile: stakerFixture.profile,
          nftMintAccount: stakerFixture.mint,
          stakeAssociatedTokenAccount: stakerFixture.stakeAssociatedTokenAccount,
          authorityNftAccount: stakerFixture.authorityNftAccount,
          rewardConfig: stakerFixture.rewardConfig,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([staker])
        .rpc();
      expect.fail("expected invalid tweet author");
    } catch (error) {
      expect(`${error}`).to.include("Invalid tweet author");
    }
  });

  it("returns nft and mints configured reward on unstake", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const authority = Keypair.generate();
    await airdrop(authority.publicKey, 2);

    const fixture = await createStakePosition(authority, "rewarded", {
      stakeBaseRewardAmount: 50,
      stakeRewardPerEpoch: 0,
    });

    await program.methods
      .unstake()
      .accountsStrict({
        authority: authority.publicKey,
        stake: fixture.stake,
        profile: fixture.profile,
        nftMintAccount: fixture.mint,
        stakeAssociatedTokenAccount: fixture.stakeAssociatedTokenAccount,
        authorityNftAccount: fixture.authorityNftAccount,
        rewardConfig: fixture.rewardConfig,
        tokenMintAccount: fixture.tokenMint,
        authorityTokenAccount: fixture.authorityTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    const authorityNftBalance =
      await program.provider.connection.getTokenAccountBalance(
        fixture.authorityNftAccount
      );
    expect(authorityNftBalance.value.amount).to.equal("1");

    const rewardBalance =
      await program.provider.connection.getTokenAccountBalance(
        fixture.authorityTokenAccount
      );
    expect(Number(rewardBalance.value.amount)).to.equal(50);

    const profileAccount = await program.account.profile.fetch(fixture.profile);
    expect(profileAccount.tokenRewardsEarned.toString()).to.equal("50");

    expect(await program.provider.connection.getAccountInfo(fixture.stake)).to.equal(
      null
    );
  });

  it("fails to unstake twice after the stake account has been closed", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const authority = Keypair.generate();
    await airdrop(authority.publicKey, 2);

    const fixture = await createStakePosition(authority, "double-unstake");

    await program.methods
      .unstake()
      .accountsStrict({
        authority: authority.publicKey,
        stake: fixture.stake,
        profile: fixture.profile,
        nftMintAccount: fixture.mint,
        stakeAssociatedTokenAccount: fixture.stakeAssociatedTokenAccount,
        authorityNftAccount: fixture.authorityNftAccount,
        rewardConfig: fixture.rewardConfig,
        tokenMintAccount: fixture.tokenMint,
        authorityTokenAccount: fixture.authorityTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    try {
      await program.methods
        .unstake()
        .accountsStrict({
          authority: authority.publicKey,
          stake: fixture.stake,
          profile: fixture.profile,
          nftMintAccount: fixture.mint,
          stakeAssociatedTokenAccount: fixture.stakeAssociatedTokenAccount,
          authorityNftAccount: fixture.authorityNftAccount,
          rewardConfig: fixture.rewardConfig,
          tokenMintAccount: fixture.tokenMint,
          authorityTokenAccount: fixture.authorityTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();
      expect.fail("second unstake should fail");
    } catch (error) {
      expect(error).to.exist;
    }
  });
});
