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
} from "./helpers";

async function createProfile(authority: any, name = "alice") {
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

describe("tweet", () => {
  it("creates tweet and increments profile tweet_count", async function () {
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
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
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
  });

  it("mints nft reward on the 10th tweet", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = await createProfile(authority, "milestone");
    const rewardConfig = await initRewardConfig(authority);
    const { mint, ata } = await createNftMintFor(authority, profile, rewardConfig);

    const beforeBalance = await program.provider.connection.getTokenAccountBalance(
      ata
    );

    for (let i = 0; i < 10; i += 1) {
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
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
    }

    const afterProfile = await program.account.profile.fetch(profile);
    expect(afterProfile.tweetCount).to.equal(10);
    expect(afterProfile.reward).to.equal(false);

    const afterBalance = await program.provider.connection.getTokenAccountBalance(
      ata
    );
    expect(Number(afterBalance.value.amount)).to.equal(
      Number(beforeBalance.value.amount) + 1
    );
  });
});
