import { expect } from "chai";
import {
  program,
  Keypair,
  SystemProgram,
  airdrop,
  profilePda,
  followPda,
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

describe("follow", () => {
  it("creates follow and increments both profile counters", async () => {
    const follower = Keypair.generate();
    const following = Keypair.generate();
    await airdrop(follower.publicKey);
    await airdrop(following.publicKey);

    const followerProfile = await createProfile(follower, "follower");
    const followingProfile = await createProfile(following, "following");
    const follow = followPda(follower.publicKey, followingProfile);

    await program.methods
      .createFollow()
      .accountsStrict({
        authority: follower.publicKey,
        follow,
        followerProfile,
        following: following.publicKey,
        followingProfile,
        systemProgram: SystemProgram.programId,
      })
      .signers([follower])
      .rpc();

    const followAccount = await program.account.follow.fetch(follow);
    expect(followAccount.followerProfilePda.toBase58()).to.equal(
      followerProfile.toBase58()
    );
    expect(followAccount.followingProfilePda.toBase58()).to.equal(
      followingProfile.toBase58()
    );
    expect(Number(followAccount.createdAt)).to.be.greaterThan(0);

    const updatedFollower = await program.account.profile.fetch(followerProfile);
    const updatedFollowing = await program.account.profile.fetch(followingProfile);
    expect(updatedFollower.followingCount).to.equal(1);
    expect(updatedFollowing.followersCount).to.equal(1);
  });

  it("cancels follow and decrements both profile counters", async () => {
    const follower = Keypair.generate();
    const following = Keypair.generate();
    await airdrop(follower.publicKey);
    await airdrop(following.publicKey);

    const followerProfile = await createProfile(follower, "follower");
    const followingProfile = await createProfile(following, "following");
    const follow = followPda(follower.publicKey, followingProfile);

    await program.methods
      .createFollow()
      .accountsStrict({
        authority: follower.publicKey,
        follow,
        followerProfile,
        following: following.publicKey,
        followingProfile,
        systemProgram: SystemProgram.programId,
      })
      .signers([follower])
      .rpc();

    await program.methods
      .cancelFollow()
      .accountsStrict({
        authority: follower.publicKey,
        follow,
        followerProfile,
        following: following.publicKey,
        followingProfile,
        systemProgram: SystemProgram.programId,
      })
      .signers([follower])
      .rpc();

    const followInfo = await program.provider.connection.getAccountInfo(follow);
    expect(followInfo).to.equal(null);

    const updatedFollower = await program.account.profile.fetch(followerProfile);
    const updatedFollowing = await program.account.profile.fetch(followingProfile);
    expect(updatedFollower.followingCount).to.equal(0);
    expect(updatedFollowing.followersCount).to.equal(0);
  });

  it("blocks self follow", async () => {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = await createProfile(authority, "self");
    const follow = followPda(authority.publicKey, profile);

    try {
      await program.methods
        .createFollow()
        .accountsStrict({
          authority: authority.publicKey,
          follow,
          followerProfile: profile,
          following: authority.publicKey,
          followingProfile: profile,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      expect.fail("expected self follow to fail");
    } catch (err: any) {
      expect(String(err)).to.include("Invalid follow");
    }
  });

  it("blocks duplicate follow for same pair", async () => {
    const follower = Keypair.generate();
    const following = Keypair.generate();
    await airdrop(follower.publicKey);
    await airdrop(following.publicKey);

    const followerProfile = await createProfile(follower, "follower");
    const followingProfile = await createProfile(following, "following");
    const follow = followPda(follower.publicKey, followingProfile);

    await program.methods
      .createFollow()
      .accountsStrict({
        authority: follower.publicKey,
        follow,
        followerProfile,
        following: following.publicKey,
        followingProfile,
        systemProgram: SystemProgram.programId,
      })
      .signers([follower])
      .rpc();

    try {
      await program.methods
        .createFollow()
        .accountsStrict({
          authority: follower.publicKey,
          follow,
          followerProfile,
          following: following.publicKey,
          followingProfile,
          systemProgram: SystemProgram.programId,
        })
        .signers([follower])
        .rpc();
      expect.fail("expected duplicate follow to fail");
    } catch (err) {
      expect(err).to.exist;
    }
  });
});
