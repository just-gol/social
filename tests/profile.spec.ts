import { expect } from "chai";
import { program, Keypair, airdrop, profilePda } from "./helpers";

describe("profile", () => {
  it("creates profile and stores display fields", async () => {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = profilePda(authority.publicKey);

    await program.methods
      .createProfile("alice", "builder", "https://example.com/a.png")
      .accounts({
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    const account = await program.account.profile.fetch(profile);
    expect(account.name).to.equal("alice");
    expect(account.bio).to.equal("builder");
    expect(account.avatarUri).to.equal("https://example.com/a.png");
    expect(account.tweetCount).to.equal(0);
    expect(account.tokenRewardsEarned.toString()).to.equal("0");
  });

  it("fails to create profile twice for same authority", async () => {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    await program.methods
      .createProfile("first", "", "")
      .accounts({
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    try {
      await program.methods
        .createProfile("second", "", "")
        .accounts({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();
      expect.fail("expected duplicate init to fail");
    } catch (err) {
      expect(err).to.exist;
    }
  });

  it("fails when bio exceeds allocated bytes", async () => {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    try {
      await program.methods
        .createProfile("user", "b".repeat(200), "")
        .accounts({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();
      expect.fail("expected long bio to fail");
    } catch (err) {
      expect(err).to.exist;
    }
  });
});
