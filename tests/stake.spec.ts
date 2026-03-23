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
  const metadata = metadataPda(mint);
  const masterEdition = masterEditionPda(mint);

  await program.methods
    .createTweet(content)
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

  return tweet;
}

async function assertRpcError(promise: Promise<unknown>, message: string) {
  try {
    await promise;
    expect.fail(`expected rpc error containing "${message}"`);
  } catch (error) {
    expect(`${error}`).to.include(message);
  }
}

async function requireMetadataProgram(context: Mocha.Context) {
  const metadataProgramInfo = await program.provider.connection.getAccountInfo(
    TOKEN_METADATA_PROGRAM_ID
  );
  if (!metadataProgramInfo || !metadataProgramInfo.executable) {
    context.skip();
  }
}

async function setupStakeFixture(authority: any, name = "staker") {
  const profile = await createProfile(authority, name);
  const rewardConfig = await initRewardConfig(authority);
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

async function createStakePosition(authority: any, name = "staker") {
  const fixture = await setupStakeFixture(authority, name);

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
      tokenMintAccount: fixture.tokenMint,
      authorTokenAccount: fixture.authorityTokenAccount,
      author: authority.publicKey,
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
  it("transfers nft into stake ata and mints reward token", async function () {
    await requireMetadataProgram(this);

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
        tokenMintAccount: fixture.tokenMint,
        authorTokenAccount: fixture.authorityTokenAccount,
        author: authority.publicKey,
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

    const rewardBalance = await program.provider.connection.getTokenAccountBalance(
      fixture.authorityTokenAccount
    );
    expect(rewardBalance.value.amount).to.equal("10000");

    const stakeAccount = await program.account.stake.fetch(fixture.stake);
    expect(stakeAccount.authority.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(stakeAccount.mint.toBase58()).to.equal(fixture.mint.toBase58());
  });

  it("rejects staking when the tweet does not belong to the staking authority", async function () {
    await requireMetadataProgram(this);

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

    await assertRpcError(
      program.methods
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
          tokenMintAccount: stakerFixture.tokenMint,
          authorTokenAccount: associatedTokenAddress(
            stakerFixture.tokenMint,
            poster.publicKey,
            TOKEN_PROGRAM_ID
          ),
          author: poster.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([staker])
        .rpc(),
      "Invalid tweet author"
    );
  });

  it("returns nft, burns reward tokens, and closes the stake on unstake", async function () {
    await requireMetadataProgram(this);

    const authority = Keypair.generate();
    await airdrop(authority.publicKey, 2);

    const fixture = await createStakePosition(authority);

    const stakedNftBalance = await program.provider.connection.getTokenAccountBalance(
      fixture.stakeAssociatedTokenAccount
    );
    expect(stakedNftBalance.value.amount).to.equal("1");

    const rewardBalanceBefore =
      await program.provider.connection.getTokenAccountBalance(
        fixture.authorityTokenAccount
      );
    expect(rewardBalanceBefore.value.amount).to.equal("10000");

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
        authorTokenAccount: fixture.authorityTokenAccount,
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

    const stakeNftBalance = await program.provider.connection.getTokenAccountBalance(
      fixture.stakeAssociatedTokenAccount
    );
    expect(stakeNftBalance.value.amount).to.equal("0");

    const rewardBalanceAfter =
      await program.provider.connection.getTokenAccountBalance(
        fixture.authorityTokenAccount
      );
    expect(rewardBalanceAfter.value.amount).to.equal("0");

    expect(await program.provider.connection.getAccountInfo(fixture.stake)).to.equal(
      null
    );
  });

  it("fails to unstake twice after the stake account has been closed", async function () {
    await requireMetadataProgram(this);

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
        authorTokenAccount: fixture.authorityTokenAccount,
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
          authorTokenAccount: fixture.authorityTokenAccount,
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
