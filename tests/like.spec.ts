import { expect } from "chai";
import {
  program,
  Keypair,
  SystemProgram,
  airdrop,
  profilePda,
  tweetPda,
  likePda,
  nftMintPda,
  metadataPda,
  associatedTokenAddress,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
} from "./helpers";

async function createProfile(authority: any) {
  const profile = profilePda(authority.publicKey);
  await program.methods
    .createProfile("user")
    .accounts({
      authority: authority.publicKey,
    })
    .signers([authority])
    .rpc();
  return profile;
}

async function ensureNftMint(payer: any) {
  const metadataProgramInfo = await program.provider.connection.getAccountInfo(
    TOKEN_METADATA_PROGRAM_ID
  );
  if (!metadataProgramInfo || !metadataProgramInfo.executable) {
    return null;
  }

  const mint = nftMintPda();
  const ata = associatedTokenAddress(mint, payer.publicKey, TOKEN_PROGRAM_ID);
  const metadata = metadataPda(mint);

  await program.methods
    .createNftMint()
    .accountsStrict({
      authority: payer.publicKey,
      nftMintAccount: mint,
      nftAssociatedTokenAccount: ata,
      metadataAccount: metadata,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([payer])
    .rpc();

  return mint;
}

describe("like", () => {
  it("creates like and increments tweet likes_count", async () => {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = await createProfile(authority);
    const profileAccount = await program.account.profile.fetch(profile);
    const tweet = tweetPda(profile, profileAccount.tweetCount);

    await program.methods
      .createTweet("first tweet")
      .accountsStrict({
        authority: authority.publicKey,
        tweet,
        profile,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

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

  it("mints reward to tweet author and blocks double claim", async function () {
    const author = Keypair.generate();
    const liker = Keypair.generate();
    await airdrop(author.publicKey);
    await airdrop(liker.publicKey);

    const mint = await ensureNftMint(liker);
    if (!mint) {
      this.skip();
    }

    const authorProfile = await createProfile(author);
    const likerProfile = await createProfile(liker);

    const authorProfileAccount = await program.account.profile.fetch(authorProfile);
    const tweet = tweetPda(authorProfile, authorProfileAccount.tweetCount);

    await program.methods
      .createTweet("rewardable tweet")
      .accountsStrict({
        authority: author.publicKey,
        tweet,
        profile: authorProfile,
        systemProgram: SystemProgram.programId,
      })
      .signers([author])
      .rpc();

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
      mint!,
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
        nftMintAccount: mint!,
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
          nftMintAccount: mint!,
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
