import { expect } from "chai";
import {
  program,
  Keypair,
  SystemProgram,
  airdrop,
  profilePda,
  tweetPda,
  likePda,
} from "./helpers";

describe("like", () => {
  it("creates like and increments tweet likes_count", async () => {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = profilePda(authority.publicKey);
    await program.methods
      .createProfile("bob")
      .accounts({
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

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
  });
});
