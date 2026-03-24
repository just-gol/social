use crate::events::{LikeCreated, RewardIssued, RewardKind};
use crate::state::mint::TokenMint;
use crate::state::profile::Profile;
use crate::state::reward_config::RewardConfig;
use crate::state::tweet::Tweet;
use crate::{errors::SocialError, state::like::Like};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{mint_to, Mint, MintTo, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct CreateLike<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub tweet: Account<'info, Tweet>,

    #[account(
        mut,
        seeds = [
            Profile::PROFILE_PREFIX,
            authority.key().as_ref(),
        ],
        bump
    )]
    pub profile: Account<'info, Profile>,

    #[account(
        init,
        payer = authority,
        space = 8 + Like::INIT_SPACE,
        seeds = [
            Like::LIKE_PREFIX,
            tweet.key().as_ref(),
            profile.key().as_ref(),
        ],
        bump
    )]
    pub like: Account<'info, Like>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintLikeReward<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub tweet: Account<'info, Tweet>,

    #[account(
        mut,
        seeds = [
            Profile::PROFILE_PREFIX,
            authority.key().as_ref(),
        ],
        bump
    )]
    pub profile: Account<'info, Profile>,

    #[account(
        mut,
        seeds = [
            Like::LIKE_PREFIX,
            tweet.key().as_ref(),
            profile.key().as_ref(),
        ],
        bump
    )]
    pub like: Account<'info, Like>,

    #[account(
        mut,
        seeds = [
            Profile::PROFILE_PREFIX,
            author.key().as_ref(),
        ],
        bump
    )]
    pub author_profile: Account<'info, Profile>,

    #[account(
        mut,
        seeds = [RewardConfig::REWARD_CONFIG_PREFIX],
        bump
    )]
    pub reward_config: Account<'info, RewardConfig>,

    #[account(
        mut,
        seeds = [TokenMint::TOKEN_MINT_PREFIX],
        bump,
    )]
    pub token_mint_account: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = token_mint_account,
        associated_token::authority = author,
        associated_token::token_program = token_program,
    )]
    pub author_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: constrained by `address = tweet.author`.
    #[account(address = tweet.author)]
    pub author: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn mint_like_reward(ctx: Context<MintLikeReward>) -> Result<()> {
    let like = &mut ctx.accounts.like;
    require!(!ctx.accounts.tweet.deleted, SocialError::TweetDeleted);
    require!(!like.reward_claimed, SocialError::RewardAlreadyClaimed);
    require!(
        like.profile_pda == ctx.accounts.profile.key(),
        SocialError::InvalidProfilePda
    );
    require!(
        like.tweet_pda == ctx.accounts.tweet.key(),
        SocialError::InvalidTweetPda
    );
    require!(
        ctx.accounts.author_profile.key()
            == Pubkey::find_program_address(
                &[Profile::PROFILE_PREFIX, ctx.accounts.author.key().as_ref()],
                ctx.program_id
            )
            .0,
        SocialError::InvalidAuthorProfile
    );
    require!(
        ctx.accounts.author_profile.tweet_count
            >= ctx.accounts.reward_config.min_tweets_before_like_reward,
        SocialError::AuthorNotEligibleForLikeReward
    );

    let current_day = Clock::get()?.unix_timestamp.div_euclid(86_400);
    ctx.accounts.profile.register_like_reward(
        current_day,
        ctx.accounts.reward_config.daily_like_reward_cap,
    )?;
    ctx.accounts.tweet.register_rewardable_like(
        ctx.accounts.reward_config.max_rewardable_likes_per_tweet,
    )?;
    like.claim_reward()?;

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint_account.to_account_info(),
                to: ctx.accounts.author_token_account.to_account_info(),
                authority: ctx.accounts.token_mint_account.to_account_info(),
            },
            &[&[
                TokenMint::TOKEN_MINT_PREFIX,
                &[ctx.bumps.token_mint_account],
            ]],
        ),
        ctx.accounts.reward_config.like_reward_amount,
    )?;
    ctx.accounts
        .author_profile
        .add_token_rewards(ctx.accounts.reward_config.like_reward_amount)?;

    emit!(RewardIssued {
        recipient: ctx.accounts.author.key(),
        reference: ctx.accounts.like.key(),
        reward_kind: RewardKind::LikeToken,
        amount: ctx.accounts.reward_config.like_reward_amount,
    });
    Ok(())
}

pub fn create_like(ctx: Context<CreateLike>) -> Result<()> {
    require!(
        ctx.accounts.tweet.author != ctx.accounts.authority.key(),
        SocialError::SelfLikeNotAllowed
    );
    require!(!ctx.accounts.tweet.deleted, SocialError::TweetDeleted);

    let created_at = Clock::get()?.unix_timestamp;
    ctx.accounts.tweet.like()?;
    ctx.accounts.like.set_inner(Like::new(
        ctx.accounts.profile.key(),
        ctx.accounts.tweet.key(),
        created_at,
    ));
    emit!(LikeCreated {
        authority: ctx.accounts.authority.key(),
        tweet: ctx.accounts.tweet.key(),
        like: ctx.accounts.like.key(),
        created_at,
    });
    Ok(())
}
