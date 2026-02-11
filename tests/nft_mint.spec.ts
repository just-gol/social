import { expect } from "chai";
import {
  program,
  Keypair,
  SystemProgram,
  airdrop,
  nftMintPda,
  metadataPda,
  associatedTokenAddress,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
} from "./helpers";

describe("nft_mint", () => {
  it("creates nft mint and logs PDAs", async function () {
    const authority = Keypair.generate();
    await airdrop(authority.publicKey);

    const mint = nftMintPda();
    const ata = associatedTokenAddress(
      mint,
      authority.publicKey,
      TOKEN_PROGRAM_ID
    );
    const metadata = metadataPda(mint);

    console.log("nft_mint_pda", mint.toBase58());
    console.log("nft_ata", ata.toBase58());
    console.log("metadata_pda", metadata.toBase58());

    const preMintInfo = await program.provider.connection.getAccountInfo(mint);
    const preAtaInfo = await program.provider.connection.getAccountInfo(ata);
    const preMetadataInfo =
      await program.provider.connection.getAccountInfo(metadata);

    console.log("mint_account_info_pre", {
      exists: !!preMintInfo,
      owner: preMintInfo?.owner.toBase58(),
      lamports: preMintInfo?.lamports,
      data_len: preMintInfo?.data?.length,
    });
    console.log("ata_account_info_pre", {
      exists: !!preAtaInfo,
      owner: preAtaInfo?.owner.toBase58(),
      lamports: preAtaInfo?.lamports,
      data_len: preAtaInfo?.data?.length,
    });
    console.log("metadata_account_info_pre", {
      exists: !!preMetadataInfo,
      owner: preMetadataInfo?.owner.toBase58(),
      lamports: preMetadataInfo?.lamports,
      data_len: preMetadataInfo?.data?.length,
    });

    const metadataProgramInfo =
      await program.provider.connection.getAccountInfo(
        TOKEN_METADATA_PROGRAM_ID
      );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const tx = await program.methods
      .createNftMint()
      .accountsStrict({
        authority: authority.publicKey,
        nftMintAccount: mint,
        nftAssociatedTokenAccount: ata,
        metadataAccount: metadata,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    expect(tx).to.be.a("string");

    const mintInfo = await program.provider.connection.getAccountInfo(mint);
    const ataInfo = await program.provider.connection.getAccountInfo(ata);
    const metadataInfo =
      await program.provider.connection.getAccountInfo(metadata);

    console.log("mint_account_info", {
      exists: !!mintInfo,
      owner: mintInfo?.owner.toBase58(),
      lamports: mintInfo?.lamports,
      data_len: mintInfo?.data?.length,
    });
    console.log("ata_account_info", {
      exists: !!ataInfo,
      owner: ataInfo?.owner.toBase58(),
      lamports: ataInfo?.lamports,
      data_len: ataInfo?.data?.length,
    });
    console.log("metadata_account_info", {
      exists: !!metadataInfo,
      owner: metadataInfo?.owner.toBase58(),
      lamports: metadataInfo?.lamports,
      data_len: metadataInfo?.data?.length,
    });
  });
});
