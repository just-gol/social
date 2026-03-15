import { expect } from "chai";
import {
  program,
  Keypair,
  SystemProgram,
  airdrop,
  profilePda,
  rewardConfigPda,
  nftMintPda,
  metadataPda,
  masterEditionPda,
  associatedTokenAddress,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
} from "./helpers";

describe("nft_mint", () => {
  it("initializes reward config and creates profile-scoped nft mint", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const profile = profilePda(authority.publicKey);
    await program.methods
      .createProfile("creator")
      .accounts({
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

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

    const mint = nftMintPda(rewardConfig, profile);
    const ata = associatedTokenAddress(mint, authority.publicKey, TOKEN_PROGRAM_ID);
    const metadata = metadataPda(mint);
    const masterEdition = masterEditionPda(mint);

    const tx = await program.methods
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

    expect(tx).to.be.a("string");

    const rewardConfigAccount = await program.account.rewardConfig.fetch(
      rewardConfig
    );
    expect(rewardConfigAccount.name).to.equal("10 Tweets Badge");
    expect(rewardConfigAccount.symbol).to.equal("TWEET10");

    const mintInfo = await program.provider.connection.getAccountInfo(mint);
    const ataInfo = await program.provider.connection.getAccountInfo(ata);
    const metadataInfo = await program.provider.connection.getAccountInfo(metadata);
    expect(!!mintInfo).to.equal(true);
    expect(!!ataInfo).to.equal(true);
    expect(!!metadataInfo).to.equal(true);
    expect(
      await program.provider.connection.getAccountInfo(masterEdition)
    ).to.equal(null);
  });
});
