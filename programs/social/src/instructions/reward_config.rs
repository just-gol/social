use crate::{errors::SocialError, state::reward_config::RewardConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitRewardConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + RewardConfig::INIT_SPACE,
        seeds = [RewardConfig::REWARD_CONFIG_PREFIX],
        bump
    )]
    pub reward_config: Account<'info, RewardConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateRewardConfig<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [RewardConfig::REWARD_CONFIG_PREFIX],
        bump
    )]
    pub reward_config: Account<'info, RewardConfig>,
}

#[allow(clippy::too_many_arguments)]
fn apply_reward_config(
    reward_config: &mut Account<RewardConfig>,
    authority: Pubkey,
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
) {
    reward_config.set_inner(RewardConfig {
        authority,
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
    });
}

#[allow(clippy::too_many_arguments)]
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
    apply_reward_config(
        &mut ctx.accounts.reward_config,
        ctx.accounts.authority.key(),
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
    );
    Ok(())
}

#[allow(clippy::too_many_arguments)]
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
    require!(
        ctx.accounts.reward_config.authority == ctx.accounts.authority.key(),
        SocialError::InvalidRewardConfigAuthority
    );
    apply_reward_config(
        &mut ctx.accounts.reward_config,
        ctx.accounts.authority.key(),
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
    );
    Ok(())
}
