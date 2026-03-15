import { expect } from "chai";
import {
  program,
  Keypair,
  PublicKey,
  SystemProgram,
  airdrop,
  profilePda,
  rewardConfigPda,
  tweetPda,
  nftMintPda,
  tokenMintPda,
  metadataPda,
  masterEditionPda,
  associatedTokenAddress,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
} from "./helpers";

async function createProfile(authority: any, name = "staker") {
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
    .initRewardConfig("Stake NFT", "STAKE", "https://example.com/stake-nft")
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

async function createTokenMint(authority: any) {
  const tokenMint = tokenMintPda();
  const metadata = metadataPda(tokenMint);

  await program.methods
    .createTokenMint()
    .accountsStrict({
      authority: authority.publicKey,
      tokenMintAccount: tokenMint,
      metadataAccount: metadata,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([authority])
    .rpc();

  return tokenMint;
}

describe("stake", () => {
  it("transfers nft into stake ata and mints reward token", async function () {
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
    const { mint: nftMint, ata: authorityNftAccount } = await createNftMintFor(
      authority,
      profile,
      rewardConfig
    );
    const tokenMint = await createTokenMint(authority);

    const profileAccount = await program.account.profile.fetch(profile);
    const tweet = tweetPda(profile, profileAccount.tweetCount);
    await program.methods
      .createTweet("stake tweet")
      .accountsStrict({
        authority: authority.publicKey,
        tweet,
        profile,
        nftMintAccount: nftMint,
        rewardConfig,
        authorNftAccount: authorityNftAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const stakeAddress = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake"),
        authority.publicKey.toBuffer(),
        nftMint.toBuffer(),
      ],
      program.programId
    )[0];

    const stakeAta = associatedTokenAddress(
      nftMint,
      stakeAddress,
      TOKEN_PROGRAM_ID
    );
    const authorityTokenAccount = associatedTokenAddress(
      tokenMint,
      authority.publicKey,
      TOKEN_PROGRAM_ID
    );

    await program.methods
      .createStake()
      .accountsStrict({
        authority: authority.publicKey,
        stake: stakeAddress,
        tweet,
        profile,
        nftMintAccount: nftMint,
        stakeAssociatedTokenAccount: stakeAta,
        authorityNftAccount,
        rewardConfig,
        tokenMintAccount: tokenMint,
        authorTokenAccount: authorityTokenAccount,
        author: authority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    const stakeAccount = await program.account.stake.fetch(stakeAddress);
    expect(stakeAccount.authority.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(stakeAccount.mint.toBase58()).to.equal(nftMint.toBase58());

    const authorityNftBalance =
      await program.provider.connection.getTokenAccountBalance(authorityNftAccount);
    expect(authorityNftBalance.value.amount).to.equal("0");

    const stakeNftBalance =
      await program.provider.connection.getTokenAccountBalance(stakeAta);
    expect(stakeNftBalance.value.amount).to.equal("1");

    const rewardBalance =
      await program.provider.connection.getTokenAccountBalance(
        authorityTokenAccount
      );
    expect(rewardBalance.value.amount).to.equal("10000");
  });
});
