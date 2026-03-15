import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
  program,
  Keypair,
  SystemProgram,
  airdrop,
  profilePda,
  rewardConfigPda,
  tokenMintPda,
  nftMintPda,
  tweetPda,
  metadataPda,
  masterEditionPda,
  associatedTokenAddress,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
} from "./helpers";

function stakePda(authority: PublicKey, mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), authority.toBuffer(), mint.toBuffer()],
    program.programId
  )[0];
}

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
    .initRewardConfig("10 Tweets Badge", "TWEET10", "https://example.com/nft")
    .accountsStrict({
      authority: authority.publicKey,
      rewardConfig,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc();
  return rewardConfig;
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

async function createNftMint(authority: any, profile: PublicKey, rewardConfig: PublicKey) {
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

async function createTweet(
  authority: any,
  profile: PublicKey,
  rewardConfig: PublicKey,
  mint: PublicKey,
  ata: PublicKey,
  content: string
) {
  const profileAccount = await program.account.profile.fetch(profile);
  const tweet = tweetPda(profile, profileAccount.tweetCount);
  const metadata = metadataPda(mint);
  const masterEdition = masterEditionPda(mint);

  await program.methods
    .createTweet(content)
    .accountsStrict({
      authority: authority.publicKey,
      tweet,
      profile,
      nftMintAccount: mint,
      rewardConfig,
      authorNftAccount: ata,
      masterEditonAccount: masterEdition,
      metadataAccount: metadata,
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

describe("stake", () => {
  it("transfers nft into stake ata and mints reward token", async function () {
    const metadataProgramInfo = await program.provider.connection.getAccountInfo(
      TOKEN_METADATA_PROGRAM_ID
    );
    if (!metadataProgramInfo || !metadataProgramInfo.executable) {
      this.skip();
    }

    const authority = Keypair.generate();
    await airdrop(authority.publicKey, 2);

    const profile = await createProfile(authority);
    const rewardConfig = await initRewardConfig(authority);
    const tokenMint = await createTokenMint(authority);
    const { mint, ata: authorityNftAccount } = await createNftMint(
      authority,
      profile,
      rewardConfig
    );

    let lastTweet = PublicKey.default;
    for (let i = 0; i < 10; i += 1) {
      lastTweet = await createTweet(
        authority,
        profile,
        rewardConfig,
        mint,
        authorityNftAccount,
        `stake-tweet-${i}`
      );
    }

    const authorityNftBalanceBefore =
      await program.provider.connection.getTokenAccountBalance(authorityNftAccount);
    expect(authorityNftBalanceBefore.value.amount).to.equal("1");

    const stake = stakePda(authority.publicKey, mint);
    const stakeAssociatedTokenAccount = associatedTokenAddress(
      mint,
      stake,
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
        stake,
        tweet: lastTweet,
        profile,
        nftMintAccount: mint,
        stakeAssociatedTokenAccount,
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

    const authorityNftBalanceAfter =
      await program.provider.connection.getTokenAccountBalance(authorityNftAccount);
    expect(authorityNftBalanceAfter.value.amount).to.equal("0");

    const stakeNftBalance = await program.provider.connection.getTokenAccountBalance(
      stakeAssociatedTokenAccount
    );
    expect(stakeNftBalance.value.amount).to.equal("1");

    const rewardBalance = await program.provider.connection.getTokenAccountBalance(
      authorityTokenAccount
    );
    expect(rewardBalance.value.amount).to.equal("10000");

    const stakeAccount = await program.account.stake.fetch(stake);
    expect(stakeAccount.authority.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(stakeAccount.mint.toBase58()).to.equal(mint.toBase58());
  });
});
