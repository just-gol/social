use crate::state::mint::TokenMint;
use crate::state::profile::Profile;
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
    require!(!like.reward_claimed, SocialError::RewardAlreadyClaimed);
    require!(
        like.profile_pda == ctx.accounts.profile.key(),
        SocialError::InvalidProfilePda
    );
    require!(
        like.tweet_pda == ctx.accounts.tweet.key(),
        SocialError::InvalidTweetPda
    );

    like.claim_reward()?;

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint_account.to_account_info(),
                to: ctx.accounts.author_token_account.to_account_info(),
                authority: ctx.accounts.token_mint_account.to_account_info(),
            },
            &[&[b"mint", &[ctx.bumps.token_mint_account]]],
        ),
        1,
    )?;
    Ok(())
}

pub fn create_like(ctx: Context<CreateLike>) -> Result<()> {
    ctx.accounts.tweet.like()?;
    ctx.accounts.like.set_inner(Like::new(
        ctx.accounts.profile.key(),
        ctx.accounts.tweet.key(),
    ));
    Ok(())
}
