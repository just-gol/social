use anchor_lang::prelude::*;

declare_id!("9BXzYsCbqFLwTzkqognW18JiZa7DrzhccsifMHSjcwxS");
pub mod instructions;
pub use instructions::*;
pub mod errors;
pub mod events;
pub mod state;
#[program]
pub mod social {
    use super::*;

    pub fn create_profile(
        ctx: Context<CreateProfile>,
        username: String,
        bio: String,
        avatar_uri: String,
    ) -> Result<()> {
        instructions::create_profile(ctx, username, bio, avatar_uri)
    }

    pub fn create_tweet(ctx: Context<CreateTweet>, content: String) -> Result<()> {
        instructions::create_tweet(ctx, content)
    }
    pub fn init_reward_config(
        ctx: Context<InitRewardConfig>,
        name: String,
        symbol: String,
        uri: String,
        milestone_tweet_count: u32,
        like_reward_amount: u64,
        stake_base_reward_amount: u64,
        stake_reward_per_epoch: u64,
        daily_tweet_reward_cap: u32,
        daily_like_reward_cap: u32,
        max_rewardable_likes_per_tweet: u32,
        min_tweets_before_like_reward: u32,
    ) -> Result<()> {
        instructions::init_reward_config(
            ctx,
            name,
            symbol,
            uri,
            milestone_tweet_count,
            like_reward_amount,
            stake_base_reward_amount,
            stake_reward_per_epoch,
            daily_tweet_reward_cap,
            daily_like_reward_cap,
            max_rewardable_likes_per_tweet,
            min_tweets_before_like_reward,
        )
    }

    pub fn update_reward_config(
        ctx: Context<UpdateRewardConfig>,
        name: String,
        symbol: String,
        uri: String,
        milestone_tweet_count: u32,
        like_reward_amount: u64,
        stake_base_reward_amount: u64,
        stake_reward_per_epoch: u64,
        daily_tweet_reward_cap: u32,
        daily_like_reward_cap: u32,
        max_rewardable_likes_per_tweet: u32,
        min_tweets_before_like_reward: u32,
    ) -> Result<()> {
        instructions::update_reward_config(
            ctx,
            name,
            symbol,
            uri,
            milestone_tweet_count,
            like_reward_amount,
            stake_base_reward_amount,
            stake_reward_per_epoch,
            daily_tweet_reward_cap,
            daily_like_reward_cap,
            max_rewardable_likes_per_tweet,
            min_tweets_before_like_reward,
        )
    }
    pub fn create_like(ctx: Context<CreateLike>) -> Result<()> {
        instructions::create_like(ctx)
    }

    pub fn delete_tweet(ctx: Context<DeleteTweet>) -> Result<()> {
        instructions::delete_tweet(ctx)
    }

    pub fn create_nft_mint(ctx: Context<CreateNftMint>) -> Result<()> {
        instructions::create_nft_mint(ctx)
    }

    pub fn create_token_mint(ctx: Context<CreateTokenMint>) -> Result<()> {
        instructions::create_token_mint(ctx)
    }

    pub fn mint_like_reward(ctx: Context<MintLikeReward>) -> Result<()> {
        instructions::mint_like_reward(ctx)
    }

    pub fn create_stake(ctx: Context<CreateStake>) -> Result<()> {
        instructions::create_stake(ctx)
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        instructions::unstake(ctx)
    }
    pub fn create_comment(ctx:Context<CreateComment>,content:String)->Result<()>{
        instructions::create_comment(ctx,content)
    }

    pub fn delete_comment(ctx:Context<DeleteComment>) ->Result<()>{
        instructions::delete_comment(ctx)
    }
    pub fn create_follow(ctx:Context<CreateFollow>)->Result<()>{
        instructions::create_follow(ctx)
    }

    pub fn cancel_follow(ctx:Context<CancelFollow>) ->Result<()>{
        instructions::cancel_follow(ctx)
    }
}
