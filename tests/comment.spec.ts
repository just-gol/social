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
  commentPda,
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

describe("comment", () => {
  it("creates comment and increments tweet/profile received counters", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const author = Keypair.generate();
    const commenter = Keypair.generate();
    await airdrop(author.publicKey);
    await airdrop(commenter.publicKey);

    const authorProfile = await createProfile(author, "author");
    const commenterProfile = await createProfile(commenter, "commenter");
    const rewardConfig = await initRewardConfig(author);
    const { mint } = await createNftMintFor(author, authorProfile, rewardConfig);
    const tweet = await createTweetFor(
      author,
      authorProfile,
      rewardConfig,
      mint,
      "commentable tweet"
    );

    const comment = commentPda(tweet, commenter.publicKey);

    await program.methods
      .createComment("nice post")
      .accountsStrict({
        authority: commenter.publicKey,
        comment,
        tweet,
        authorProfile: commenterProfile,
        tweetProfile: authorProfile,
        systemProgram: SystemProgram.programId,
      })
      .signers([commenter])
      .rpc();

    const commentAccount = await program.account.comment.fetch(comment);
    expect(commentAccount.author.toBase58()).to.equal(commenter.publicKey.toBase58());
    expect(commentAccount.tweetPda.toBase58()).to.equal(tweet.toBase58());
    expect(commentAccount.authorProfilePda.toBase58()).to.equal(
      commenterProfile.toBase58()
    );
    expect(commentAccount.content).to.equal("nice post");
    expect(commentAccount.deleted).to.equal(false);
    expect(Number(commentAccount.createdAt)).to.be.greaterThan(0);

    const tweetAccount = await program.account.tweet.fetch(tweet);
    expect(tweetAccount.commentsCount).to.equal(1);

    const updatedAuthorProfile = await program.account.profile.fetch(authorProfile);
    expect(updatedAuthorProfile.commentsReceivedCount).to.equal(1);
  });

  it("deletes own comment and decrements counters", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const author = Keypair.generate();
    const commenter = Keypair.generate();
    await airdrop(author.publicKey);
    await airdrop(commenter.publicKey);

    const authorProfile = await createProfile(author, "author");
    const commenterProfile = await createProfile(commenter, "commenter");
    const rewardConfig = await initRewardConfig(author);
    const { mint } = await createNftMintFor(author, authorProfile, rewardConfig);
    const tweet = await createTweetFor(author, authorProfile, rewardConfig, mint, "tweet");
    const comment = commentPda(tweet, commenter.publicKey);

    await program.methods
      .createComment("will delete")
      .accountsStrict({
        authority: commenter.publicKey,
        comment,
        tweet,
        authorProfile: commenterProfile,
        tweetProfile: authorProfile,
        systemProgram: SystemProgram.programId,
      })
      .signers([commenter])
      .rpc();

    await program.methods
      .deleteComment()
      .accountsStrict({
        authority: commenter.publicKey,
        comment,
        tweet,
        tweetProfile: authorProfile,
        systemProgram: SystemProgram.programId,
      })
      .signers([commenter])
      .rpc();

    const commentAccount = await program.account.comment.fetch(comment);
    expect(commentAccount.deleted).to.equal(true);

    const tweetAccount = await program.account.tweet.fetch(tweet);
    expect(tweetAccount.commentsCount).to.equal(0);

    const updatedAuthorProfile = await program.account.profile.fetch(authorProfile);
    expect(updatedAuthorProfile.commentsReceivedCount).to.equal(0);
  });

  it("blocks comment creation on deleted tweet", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const author = Keypair.generate();
    const commenter = Keypair.generate();
    await airdrop(author.publicKey);
    await airdrop(commenter.publicKey);

    const authorProfile = await createProfile(author, "author");
    const commenterProfile = await createProfile(commenter, "commenter");
    const rewardConfig = await initRewardConfig(author);
    const { mint } = await createNftMintFor(author, authorProfile, rewardConfig);
    const tweet = await createTweetFor(author, authorProfile, rewardConfig, mint, "tweet");

    await program.methods
      .deleteTweet()
      .accountsStrict({
        authority: author.publicKey,
        tweet,
        profile: authorProfile,
      })
      .signers([author])
      .rpc();

    const comment = commentPda(tweet, commenter.publicKey);
    try {
      await program.methods
        .createComment("should fail")
        .accountsStrict({
          authority: commenter.publicKey,
          comment,
          tweet,
          authorProfile: commenterProfile,
          tweetProfile: authorProfile,
          systemProgram: SystemProgram.programId,
        })
        .signers([commenter])
        .rpc();
      expect.fail("comment creation on deleted tweet should fail");
    } catch (error) {
      expect(`${error}`).to.include("Tweet is already deleted");
    }
  });

  it("blocks deleting another user's comment", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const author = Keypair.generate();
    const commenter = Keypair.generate();
    const attacker = Keypair.generate();
    await airdrop(author.publicKey);
    await airdrop(commenter.publicKey);
    await airdrop(attacker.publicKey);

    const authorProfile = await createProfile(author, "author");
    const commenterProfile = await createProfile(commenter, "commenter");
    await createProfile(attacker, "attacker");
    const rewardConfig = await initRewardConfig(author);
    const { mint } = await createNftMintFor(author, authorProfile, rewardConfig);
    const tweet = await createTweetFor(author, authorProfile, rewardConfig, mint, "tweet");
    const comment = commentPda(tweet, commenter.publicKey);

    await program.methods
      .createComment("hands off")
      .accountsStrict({
        authority: commenter.publicKey,
        comment,
        tweet,
        authorProfile: commenterProfile,
        tweetProfile: authorProfile,
        systemProgram: SystemProgram.programId,
      })
      .signers([commenter])
      .rpc();

    try {
      await program.methods
        .deleteComment()
        .accountsStrict({
          authority: attacker.publicKey,
          comment,
          tweet,
          tweetProfile: authorProfile,
          systemProgram: SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();
      expect.fail("non author should not delete comment");
    } catch (error) {
      expect(`${error}`).to.include("Not author");
    }
  });
});
