import { expect } from "chai";
import {
  program,
  Keypair,
  SystemProgram,
  airdrop,
  profilePda,
  tweetPda,
} from "./helpers";

describe("tweet", () => {
  it("creates tweet and increments profile tweet_count", async () => {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = profilePda(authority.publicKey);
    await program.methods
      .createProfile("alice")
      .accounts({
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    const before = await program.account.profile.fetch(profile);
    const tweet = tweetPda(profile, before.tweetCount);

    await program.methods
      .createTweet("hello world")
      .accountsStrict({
        authority: authority.publicKey,
        tweet,
        profile,
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
});
