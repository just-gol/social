import { BN, AnchorProvider, BorshAccountsCoder, Program, web3 } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../../../../target/idl/social.json";
import type { Social } from "../../../../target/types/social";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  DEFAULT_RPC_URL,
  PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "./constants";
import {
  associatedTokenAddress,
  likePda,
  masterEditionPda,
  metadataPda,
  nftMintPda,
  profilePda,
  rewardConfigPda,
  stakePda,
  tokenMintPda,
  tweetPda,
} from "./pda";

const typedIdl = idl as Social;
const tokenProgramId = new PublicKey(TOKEN_PROGRAM_ID);
const associatedTokenProgramId = new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
const tokenMetadataProgramId = new PublicKey(TOKEN_METADATA_PROGRAM_ID);

type ToStringable = { toString(): string };

type RawProfile = {
  name: string;
  bio: string;
  avatar_uri?: string;
  avatarUri?: string;
  tweet_count?: number;
  tweetCount?: number;
  last_tweet_day?: ToStringable | number;
  lastTweetDay?: ToStringable | number;
  daily_tweet_count?: number;
  dailyTweetCount?: number;
  last_like_reward_day?: ToStringable | number;
  lastLikeRewardDay?: ToStringable | number;
  daily_like_reward_count?: number;
  dailyLikeRewardCount?: number;
  token_rewards_earned?: ToStringable;
  tokenRewardsEarned?: ToStringable;
  nft_rewards_earned?: number;
  nftRewardsEarned?: number;
};

type RawTweet = {
  content: string;
  author: PublicKey;
  likes_count?: number;
  likesCount?: number;
  rewardable_likes_count?: number;
  rewardableLikesCount?: number;
  created_at?: ToStringable | number;
  createdAt?: ToStringable | number;
  deleted: boolean;
};

type RawLike = {
  profile_pda?: PublicKey;
  profilePda?: PublicKey;
  tweet_pda?: PublicKey;
  tweetPda?: PublicKey;
  reward_claimed?: boolean;
  rewardClaimed?: boolean;
  created_at?: ToStringable | number;
  createdAt?: ToStringable | number;
};

type RawStake = {
  authority: PublicKey;
  mint: PublicKey;
  at?: ToStringable | number;
};

type RawRewardConfig = {
  authority: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  milestone_tweet_count?: number;
  milestoneTweetCount?: number;
  like_reward_amount?: ToStringable;
  likeRewardAmount?: ToStringable;
  stake_base_reward_amount?: ToStringable;
  stakeBaseRewardAmount?: ToStringable;
  stake_reward_per_epoch?: ToStringable;
  stakeRewardPerEpoch?: ToStringable;
  daily_tweet_reward_cap?: number;
  dailyTweetRewardCap?: number;
  daily_like_reward_cap?: number;
  dailyLikeRewardCap?: number;
  max_rewardable_likes_per_tweet?: number;
  maxRewardableLikesPerTweet?: number;
  min_tweets_before_like_reward?: number;
  minTweetsBeforeLikeReward?: number;
};

export type RewardConfigView = {
  address: string;
  authority: string;
  name: string;
  symbol: string;
  uri: string;
  milestoneTweetCount: number;
  likeRewardAmount: string;
  stakeBaseRewardAmount: string;
  stakeRewardPerEpoch: string;
  dailyTweetRewardCap: number;
  dailyLikeRewardCap: number;
  maxRewardableLikesPerTweet: number;
  minTweetsBeforeLikeReward: number;
};

export type RewardConfigFormInput = {
  name: string;
  symbol: string;
  uri: string;
  milestoneTweetCount: string;
  likeRewardAmount: string;
  stakeBaseRewardAmount: string;
  stakeRewardPerEpoch: string;
  dailyTweetRewardCap: string;
  dailyLikeRewardCap: string;
  maxRewardableLikesPerTweet: string;
  minTweetsBeforeLikeReward: string;
};

export type ProfileView = {
  address: string;
  authority: string;
  name: string;
  bio: string;
  avatarUri: string;
  tweetCount: number;
  dailyTweetCount: number;
  dailyLikeRewardCount: number;
  tokenRewardsEarned: string;
  nftRewardsEarned: number;
  lastTweetDay: string;
  lastLikeRewardDay: string;
};

export type LikeView = {
  address: string;
  profileAddress: string;
  tweetAddress: string;
  rewardClaimed: boolean;
  createdAt: number;
};

export type TweetView = {
  address: string;
  content: string;
  author: string;
  authorProfileAddress: string;
  authorName: string;
  authorAvatarUri: string;
  likesCount: number;
  rewardableLikesCount: number;
  createdAt: number;
  deleted: boolean;
  viewerLike: LikeView | null;
  claimableAuthorLike: LikeView | null;
};

export type StakeView = {
  address: string;
  authority: string;
  mint: string;
  at: string;
};

export type EnvironmentStatus = {
  rpcUrl: string;
  rewardConfigPda: string;
  programId: string;
};

export type ViewerState = {
  walletAddress: string | null;
  profilePda: string | null;
  profile: ProfileView | null;
  isAdmin: boolean;
  nftMintAddress: string | null;
  nftMintInitialized: boolean;
  nftBalance: string;
  tokenMintAddress: string;
  tokenMintInitialized: boolean;
  tokenBalance: string;
  stake: StakeView | null;
  ownTweets: TweetView[];
};

export type AppState = {
  environment: EnvironmentStatus;
  rewardConfig: RewardConfigView | null;
  tweets: TweetView[];
  currentEpoch: number;
  viewer: ViewerState;
};

export type ProfileFormInput = {
  name: string;
  bio: string;
  avatarUri: string;
};

function toNumber(value: ToStringable | number) {
  return typeof value === "number" ? value : Number(value.toString());
}

function toString(value: ToStringable | number | string) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return value.toString();
}

function formatDayCounter(day: number) {
  if (day <= 0) {
    return "0";
  }
  const date = new Date(day * 86_400_000);
  return Number.isNaN(date.getTime()) ? String(day) : date.toISOString().slice(0, 10);
}

function mapProfile(address: PublicKey, authority: PublicKey, raw: RawProfile): ProfileView {
  return {
    address: address.toBase58(),
    authority: authority.toBase58(),
    name: raw.name,
    bio: raw.bio,
    avatarUri: raw.avatar_uri ?? raw.avatarUri ?? "",
    tweetCount: raw.tweet_count ?? raw.tweetCount ?? 0,
    dailyTweetCount: raw.daily_tweet_count ?? raw.dailyTweetCount ?? 0,
    dailyLikeRewardCount:
      raw.daily_like_reward_count ?? raw.dailyLikeRewardCount ?? 0,
    tokenRewardsEarned: toString(
      raw.token_rewards_earned ?? raw.tokenRewardsEarned ?? 0
    ),
    nftRewardsEarned: raw.nft_rewards_earned ?? raw.nftRewardsEarned ?? 0,
    lastTweetDay: formatDayCounter(
      toNumber(raw.last_tweet_day ?? raw.lastTweetDay ?? 0)
    ),
    lastLikeRewardDay: formatDayCounter(
      toNumber(raw.last_like_reward_day ?? raw.lastLikeRewardDay ?? 0)
    ),
  };
}

function mapRewardConfig(address: PublicKey, raw: RawRewardConfig): RewardConfigView {
  return {
    address: address.toBase58(),
    authority: raw.authority.toBase58(),
    name: raw.name,
    symbol: raw.symbol,
    uri: raw.uri,
    milestoneTweetCount:
      raw.milestone_tweet_count ?? raw.milestoneTweetCount ?? 0,
    likeRewardAmount: toString(raw.like_reward_amount ?? raw.likeRewardAmount ?? 0),
    stakeBaseRewardAmount: toString(
      raw.stake_base_reward_amount ?? raw.stakeBaseRewardAmount ?? 0
    ),
    stakeRewardPerEpoch: toString(
      raw.stake_reward_per_epoch ?? raw.stakeRewardPerEpoch ?? 0
    ),
    dailyTweetRewardCap:
      raw.daily_tweet_reward_cap ?? raw.dailyTweetRewardCap ?? 0,
    dailyLikeRewardCap:
      raw.daily_like_reward_cap ?? raw.dailyLikeRewardCap ?? 0,
    maxRewardableLikesPerTweet:
      raw.max_rewardable_likes_per_tweet ?? raw.maxRewardableLikesPerTweet ?? 0,
    minTweetsBeforeLikeReward:
      raw.min_tweets_before_like_reward ?? raw.minTweetsBeforeLikeReward ?? 0,
  };
}

function mapStake(address: PublicKey, raw: RawStake): StakeView {
  return {
    address: address.toBase58(),
    authority: raw.authority.toBase58(),
    mint: raw.mint.toBase58(),
    at: toString(raw.at ?? 0),
  };
}

function parseRewardConfigArgs(input: RewardConfigFormInput) {
  return {
    name: input.name.trim(),
    symbol: input.symbol.trim(),
    uri: input.uri.trim(),
    milestoneTweetCount: Number(input.milestoneTweetCount),
    likeRewardAmount: new BN(input.likeRewardAmount),
    stakeBaseRewardAmount: new BN(input.stakeBaseRewardAmount),
    stakeRewardPerEpoch: new BN(input.stakeRewardPerEpoch),
    dailyTweetRewardCap: Number(input.dailyTweetRewardCap),
    dailyLikeRewardCap: Number(input.dailyLikeRewardCap),
    maxRewardableLikesPerTweet: Number(input.maxRewardableLikesPerTweet),
    minTweetsBeforeLikeReward: Number(input.minTweetsBeforeLikeReward),
  };
}

export function createConnection(rpcUrl = DEFAULT_RPC_URL) {
  return new Connection(rpcUrl, "confirmed");
}

export function createProgram(provider: AnchorProvider) {
  return new Program<Social>(typedIdl, provider);
}

export function createAccountsCoder() {
  return new BorshAccountsCoder(typedIdl);
}

async function fetchDecodedAccount<T>(
  connection: Connection,
  accountName: "profile" | "rewardConfig" | "like" | "stake",
  address: PublicKey
) {
  const info = await connection.getAccountInfo(address);
  if (!info) {
    return null;
  }
  const coder = createAccountsCoder();
  const idlAccountName =
    accountName === "profile"
      ? "Profile"
      : accountName === "rewardConfig"
        ? "RewardConfig"
        : accountName === "like"
          ? "Like"
          : "Stake";
  return coder.decode(idlAccountName, info.data) as T;
}

async function fetchTokenBalance(connection: Connection, mint: PublicKey, owner: PublicKey) {
  const mintInfo = await connection.getAccountInfo(mint);
  const mintProgram = mintInfo?.owner ?? tokenProgramId;
  const ata = associatedTokenAddress(mint, owner, mintProgram);
  const info = await connection.getAccountInfo(ata);
  if (!info) {
    return { address: ata.toBase58(), amount: "0" };
  }
  const balance = await connection.getTokenAccountBalance(ata);
  return { address: ata.toBase58(), amount: balance.value.amount };
}

async function fetchProfileView(
  connection: Connection,
  authority: PublicKey
): Promise<ProfileView | null> {
  const address = profilePda(authority);
  const raw = await fetchDecodedAccount<RawProfile>(connection, "profile", address);
  if (!raw) {
    return null;
  }
  return mapProfile(address, authority, raw);
}

export async function fetchRewardConfig(
  connection: Connection
): Promise<RewardConfigView | null> {
  const address = rewardConfigPda();
  const raw = await fetchDecodedAccount<RawRewardConfig>(connection, "rewardConfig", address);
  if (!raw) {
    return null;
  }
  return mapRewardConfig(address, raw);
}

export function describeEnvironment(rpcUrl = DEFAULT_RPC_URL): EnvironmentStatus {
  return {
    rpcUrl,
    rewardConfigPda: rewardConfigPda().toBase58(),
    programId: PROGRAM_ID,
  };
}

export async function loadAppState(
  connection: Connection,
  viewerAddress: string | null
): Promise<AppState> {
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: web3.Keypair.generate().publicKey,
      signAllTransactions: async <T>(txs: T[]) => txs,
      signTransaction: async <T>(tx: T) => tx,
    },
    { commitment: "confirmed" }
  );
  const program = createProgram(provider);
  const viewerKey = viewerAddress ? new PublicKey(viewerAddress) : null;
  const environment = describeEnvironment(connection.rpcEndpoint);

  const [rewardConfig, epochInfo, tweetRecords, viewerProfile] = await Promise.all([
    fetchRewardConfig(connection),
    connection.getEpochInfo(),
    program.account.tweet.all(),
    viewerKey ? fetchProfileView(connection, viewerKey) : Promise.resolve(null),
  ]);

  const authorKeys = Array.from(
    new Set(tweetRecords.map((entry) => (entry.account as unknown as RawTweet).author.toBase58()))
  ).map((value) => new PublicKey(value));

  const authorProfiles = await Promise.all(authorKeys.map((key) => fetchProfileView(connection, key)));
  const authorProfileMap = new Map<string, ProfileView>();
  authorProfiles.forEach((profile) => {
    if (profile) {
      authorProfileMap.set(profile.authority, profile);
    }
  });

  const likeRecords = await program.account.like.all();
  const likeViews = likeRecords.map((entry) => {
    const raw = entry.account as unknown as RawLike;
    return {
      address: entry.publicKey.toBase58(),
      profileAddress: (raw.profile_pda ?? raw.profilePda)!.toBase58(),
      tweetAddress: (raw.tweet_pda ?? raw.tweetPda)!.toBase58(),
      rewardClaimed: raw.reward_claimed ?? raw.rewardClaimed ?? false,
      createdAt: toNumber(raw.created_at ?? raw.createdAt ?? 0),
    } satisfies LikeView;
  });
  const likeMap = new Map(likeViews.map((view) => [view.address, view]));
  const claimableLikeByTweet = new Map<string, LikeView>();
  for (const like of likeViews) {
    if (!like.rewardClaimed && !claimableLikeByTweet.has(like.tweetAddress)) {
      claimableLikeByTweet.set(like.tweetAddress, like);
    }
  }

  const tweets = tweetRecords
    .map((entry) => {
      const raw = entry.account as unknown as RawTweet;
      const author = raw.author.toBase58();
      const authorProfileAddress = profilePda(raw.author).toBase58();
      const viewerLikeAddress =
        viewerProfile && likeMap.size
          ? likePda(entry.publicKey, new PublicKey(viewerProfile.address)).toBase58()
          : null;
      const authorProfile = authorProfileMap.get(author);
      return {
        address: entry.publicKey.toBase58(),
        content: raw.content,
        author,
        authorProfileAddress,
        authorName: authorProfile?.name ?? author.slice(0, 6),
        authorAvatarUri: authorProfile?.avatarUri ?? "",
        likesCount: raw.likes_count ?? raw.likesCount ?? 0,
        rewardableLikesCount:
          raw.rewardable_likes_count ?? raw.rewardableLikesCount ?? 0,
        createdAt: toNumber(raw.created_at ?? raw.createdAt ?? 0),
        deleted: raw.deleted,
        viewerLike: viewerLikeAddress ? likeMap.get(viewerLikeAddress) ?? null : null,
        claimableAuthorLike: claimableLikeByTweet.get(entry.publicKey.toBase58()) ?? null,
      } satisfies TweetView;
    })
    .filter((tweet) => !tweet.deleted)
    .sort((a, b) => b.createdAt - a.createdAt);

  const tokenMint = tokenMintPda();
  const tokenMintInitialized = !!(await connection.getAccountInfo(tokenMint));

  let viewerNftMint: PublicKey | null = null;
  let viewerNftMintInitialized = false;
  let viewerNftBalance = "0";
  let viewerStake: StakeView | null = null;
  let viewerTokenBalance = "0";

  if (viewerKey && viewerProfile && rewardConfig) {
    viewerNftMint = nftMintPda(new PublicKey(rewardConfig.address), new PublicKey(viewerProfile.address));
    viewerNftMintInitialized = !!(await connection.getAccountInfo(viewerNftMint));

    if (viewerNftMintInitialized) {
      const nftBalance = await fetchTokenBalance(connection, viewerNftMint, viewerKey);
      viewerNftBalance = nftBalance.amount;

      const stakeAddress = stakePda(viewerKey, viewerNftMint);
      const rawStake = await fetchDecodedAccount<RawStake>(connection, "stake", stakeAddress);
      if (rawStake) {
        viewerStake = mapStake(stakeAddress, rawStake);
      }
    }
  }

  if (viewerKey && tokenMintInitialized) {
    const tokenBalance = await fetchTokenBalance(connection, tokenMint, viewerKey);
    viewerTokenBalance = tokenBalance.amount;
  }

  const ownTweets = viewerKey
    ? tweets.filter((tweet) => tweet.author === viewerKey.toBase58())
    : [];

  return {
    environment,
    rewardConfig,
    tweets,
    currentEpoch: epochInfo.epoch,
    viewer: {
      walletAddress: viewerKey?.toBase58() ?? null,
      profilePda: viewerKey ? profilePda(viewerKey).toBase58() : null,
      profile: viewerProfile,
      isAdmin: !!(viewerKey && rewardConfig && rewardConfig.authority === viewerKey.toBase58()),
      nftMintAddress: viewerNftMint?.toBase58() ?? null,
      nftMintInitialized: viewerNftMintInitialized,
      nftBalance: viewerNftBalance,
      tokenMintAddress: tokenMint.toBase58(),
      tokenMintInitialized,
      tokenBalance: viewerTokenBalance,
      stake: viewerStake,
      ownTweets,
    },
  };
}

export async function airdropSol(
  connection: Connection,
  address: PublicKey,
  sol = 1
) {
  const signature = await connection.requestAirdrop(address, sol * web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

function assertWallet(provider: AnchorProvider) {
  if (!provider.wallet.publicKey) {
    throw new Error("Connect a browser wallet first.");
  }
  return provider.wallet.publicKey;
}

async function requireProfile(connection: Connection, authority: PublicKey) {
  const profile = await fetchProfileView(connection, authority);
  if (!profile) {
    throw new Error("Create a profile first.");
  }
  return profile;
}

async function requireRewardConfig(connection: Connection) {
  const config = await fetchRewardConfig(connection);
  if (!config) {
    throw new Error("Initialize the global RewardConfig first.");
  }
  return config;
}

async function requireTokenMintProgram(connection: Connection, mint: PublicKey) {
  const mintInfo = await connection.getAccountInfo(mint);
  if (!mintInfo) {
    throw new Error("Create the global Token Mint first.");
  }
  return mintInfo.owner;
}

export async function createProfileTx(
  provider: AnchorProvider,
  input: ProfileFormInput
) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const profile = profilePda(authority);
  return program.methods
    .createProfile(input.name.trim(), input.bio.trim(), input.avatarUri.trim())
    .accountsStrict({
      authority,
      profile,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function initRewardConfigTx(
  provider: AnchorProvider,
  input: RewardConfigFormInput
) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const rewardConfig = rewardConfigPda();
  const args = parseRewardConfigArgs(input);
  return program.methods
    .initRewardConfig(
      args.name,
      args.symbol,
      args.uri,
      args.milestoneTweetCount,
      args.likeRewardAmount,
      args.stakeBaseRewardAmount,
      args.stakeRewardPerEpoch,
      args.dailyTweetRewardCap,
      args.dailyLikeRewardCap,
      args.maxRewardableLikesPerTweet,
      args.minTweetsBeforeLikeReward
    )
    .accountsStrict({
      authority,
      rewardConfig,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function updateRewardConfigTx(
  provider: AnchorProvider,
  input: RewardConfigFormInput
) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const rewardConfig = rewardConfigPda();
  const args = parseRewardConfigArgs(input);
  return program.methods
    .updateRewardConfig(
      args.name,
      args.symbol,
      args.uri,
      args.milestoneTweetCount,
      args.likeRewardAmount,
      args.stakeBaseRewardAmount,
      args.stakeRewardPerEpoch,
      args.dailyTweetRewardCap,
      args.dailyLikeRewardCap,
      args.maxRewardableLikesPerTweet,
      args.minTweetsBeforeLikeReward
    )
    .accountsStrict({
      authority,
      rewardConfig,
    })
    .rpc();
}

export async function createTokenMintTx(provider: AnchorProvider) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const tokenMint = tokenMintPda();
  return program.methods
    .createTokenMint()
    .accountsStrict({
      authority,
      tokenMintAccount: tokenMint,
      metadataAccount: metadataPda(tokenMint),
      tokenMetadataProgram: tokenMetadataProgramId,
      tokenProgram: tokenProgramId,
      systemProgram: SystemProgram.programId,
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();
}

export async function createNftMintTx(provider: AnchorProvider) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const rewardConfig = await requireRewardConfig(provider.connection);
  const profile = await requireProfile(provider.connection, authority);
  const profileKey = new PublicKey(profile.address);
  const rewardConfigKey = new PublicKey(rewardConfig.address);
  const nftMint = nftMintPda(rewardConfigKey, profileKey);
  return program.methods
    .createNftMint()
    .accountsStrict({
      authority,
      profile: profileKey,
      rewardConfig: rewardConfigKey,
      nftMintAccount: nftMint,
      nftAssociatedTokenAccount: associatedTokenAddress(nftMint, authority),
      metadataAccount: metadataPda(nftMint),
      masterEditonAccount: masterEditionPda(nftMint),
      tokenMetadataProgram: tokenMetadataProgramId,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: associatedTokenProgramId,
      tokenProgram: tokenProgramId,
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();
}

export async function createTweetTx(provider: AnchorProvider, content: string) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const rewardConfig = await requireRewardConfig(provider.connection);
  const profile = await requireProfile(provider.connection, authority);
  const profileKey = new PublicKey(profile.address);
  const rewardConfigKey = new PublicKey(rewardConfig.address);
  const nftMint = nftMintPda(rewardConfigKey, profileKey);
  const nftMintInfo = await provider.connection.getAccountInfo(nftMint);
  if (!nftMintInfo) {
    throw new Error("Initialize your milestone NFT mint before posting.");
  }
  const tweet = tweetPda(profileKey, profile.tweetCount);
  return program.methods
    .createTweet(content.trim())
    .accountsStrict({
      authority,
      tweet,
      profile: profileKey,
      nftMintAccount: nftMint,
      rewardConfig: rewardConfigKey,
      authorNftAccount: associatedTokenAddress(nftMint, authority),
      masterEditonAccount: masterEditionPda(nftMint),
      metadataAccount: metadataPda(nftMint),
      tokenMetadataProgram: tokenMetadataProgramId,
      tokenProgram: tokenProgramId,
      associatedTokenProgram: associatedTokenProgramId,
      systemProgram: SystemProgram.programId,
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();
}

export async function deleteTweetTx(provider: AnchorProvider, tweetAddress: string) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const profile = profilePda(authority);
  return program.methods
    .deleteTweet()
    .accountsStrict({
      authority,
      tweet: new PublicKey(tweetAddress),
      profile,
    })
    .rpc();
}

export async function createLikeTx(provider: AnchorProvider, tweetAddress: string) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const profile = await requireProfile(provider.connection, authority);
  const profileKey = new PublicKey(profile.address);
  const tweet = new PublicKey(tweetAddress);
  return program.methods
    .createLike()
    .accountsStrict({
      authority,
      tweet,
      profile: profileKey,
      like: likePda(tweet, profileKey),
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function mintLikeRewardTx(
  provider: AnchorProvider,
  tweet: TweetView
) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const rewardConfig = await requireRewardConfig(provider.connection);
  const authorProfile = await requireProfile(provider.connection, authority);
  const authorProfileKey = new PublicKey(authorProfile.address);
  const tweetKey = new PublicKey(tweet.address);
  if (tweet.author !== authority.toBase58()) {
    throw new Error("Only the tweet author can settle this reward.");
  }
  const claimableLike = tweet.claimableAuthorLike;
  if (!claimableLike) {
    throw new Error("This tweet has no pending like rewards to settle.");
  }
  const likerProfileKey = new PublicKey(claimableLike.profileAddress);
  const tokenMint = tokenMintPda();
  const tokenMintProgram = await requireTokenMintProgram(provider.connection, tokenMint);
  return program.methods
    .mintLikeReward()
    .accountsStrict({
      authority,
      tweet: tweetKey,
      authorProfile: authorProfileKey,
      like: new PublicKey(claimableLike.address),
      likerProfile: likerProfileKey,
      rewardConfig: new PublicKey(rewardConfig.address),
      tokenMintAccount: tokenMint,
      authorityTokenAccount: associatedTokenAddress(tokenMint, authority, tokenMintProgram),
      tokenProgram: tokenMintProgram,
      associatedTokenProgram: associatedTokenProgramId,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function createStakeTx(
  provider: AnchorProvider,
  tweetAddress: string
) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const rewardConfig = await requireRewardConfig(provider.connection);
  const profile = await requireProfile(provider.connection, authority);
  const profileKey = new PublicKey(profile.address);
  const rewardConfigKey = new PublicKey(rewardConfig.address);
  const nftMint = nftMintPda(rewardConfigKey, profileKey);
  const stake = stakePda(authority, nftMint);
  return program.methods
    .createStake()
    .accountsStrict({
      authority,
      stake,
      tweet: new PublicKey(tweetAddress),
      profile: profileKey,
      nftMintAccount: nftMint,
      stakeAssociatedTokenAccount: associatedTokenAddress(nftMint, stake),
      authorityNftAccount: associatedTokenAddress(nftMint, authority),
      rewardConfig: rewardConfigKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: tokenProgramId,
      associatedTokenProgram: associatedTokenProgramId,
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();
}

export async function unstakeTx(provider: AnchorProvider) {
  const authority = assertWallet(provider);
  const program = createProgram(provider);
  const rewardConfig = await requireRewardConfig(provider.connection);
  const profile = await requireProfile(provider.connection, authority);
  const profileKey = new PublicKey(profile.address);
  const rewardConfigKey = new PublicKey(rewardConfig.address);
  const nftMint = nftMintPda(rewardConfigKey, profileKey);
  const stake = stakePda(authority, nftMint);
  const tokenMint = tokenMintPda();
  const tokenMintProgram = await requireTokenMintProgram(provider.connection, tokenMint);
  return program.methods
    .unstake()
    .accountsStrict({
      authority,
      stake,
      profile: profileKey,
      nftMintAccount: nftMint,
      stakeAssociatedTokenAccount: associatedTokenAddress(nftMint, stake),
      authorityNftAccount: associatedTokenAddress(nftMint, authority),
      rewardConfig: rewardConfigKey,
      tokenMintAccount: tokenMint,
      authorityTokenAccount: associatedTokenAddress(tokenMint, authority, tokenMintProgram),
      systemProgram: SystemProgram.programId,
      tokenProgram: tokenMintProgram,
      associatedTokenProgram: associatedTokenProgramId,
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();
}
