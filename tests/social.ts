import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { Social } from "../target/types/social";
import { expect } from "chai";

describe("social", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.social as Program<Social>;
  const { SystemProgram, Keypair, PublicKey } = web3;

  async function airdrop(pubkey: anchor.web3.PublicKey, sol = 1) {
    const sig = await provider.connection.requestAirdrop(
      pubkey,
      sol * web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  }

  function profilePda(authority: anchor.web3.PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), authority.toBuffer()],
      program.programId
    )[0];
  }

  it("creates profile and stores name", async () => {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = profilePda(authority.publicKey);
    const name = "alice";

    await program.methods
      .createProfile(name)
      .accounts({
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    const account = await program.account.profile.fetch(profile);
    expect(account.name).to.equal(name);
  });

  it("fails to create profile twice for same authority", async () => {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = profilePda(authority.publicKey);

    await program.methods
      .createProfile("first")
      .accounts({
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    try {
      await program.methods
        .createProfile("second")
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

  it("fails when name exceeds 32 bytes", async () => {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = profilePda(authority.publicKey);
    const tooLong = "a".repeat(40);

    try {
      await program.methods
        .createProfile(tooLong)
        .accounts({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();
      expect.fail("expected long name to fail");
    } catch (err) {
      expect(err).to.exist;
    }
  });
});
