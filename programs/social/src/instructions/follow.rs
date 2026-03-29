use crate::errors::SocialError;
use crate::events::{FollowCanceled, FollowCreated};
use crate::state::follow::Follow;
use crate::state::profile::Profile;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreateFollow<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8+Follow::INIT_SPACE,
        seeds = [
            Follow::FOLLOW_PREFIX,
            authority.key().as_ref(),
            following_profile.key().as_ref(),
        ],
        bump
    )]
    pub follow: Account<'info, Follow>,

    #[account(
        mut,
        seeds = [
            Profile::PROFILE_PREFIX,
            authority.key().as_ref(),
        ],
        bump
    )]
    pub follower_profile: Account<'info, Profile>,

    /// CHECK:目标用户
    pub following:UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            Profile::PROFILE_PREFIX,
            following.key().as_ref(),
        ],
        bump
    )]
    pub following_profile: Account<'info, Profile>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelFollow<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
      mut,
      close=authority,
      seeds = [
            Follow::FOLLOW_PREFIX,
            authority.key().as_ref(),
            following_profile.key().as_ref(),
        ],
        bump
    )]
    pub follow: Account<'info, Follow>,

    #[account(
        mut,
        seeds = [
            Profile::PROFILE_PREFIX,
            authority.key().as_ref(),
        ],
        bump
    )]
    pub follower_profile: Account<'info, Profile>,

    /// CHECK: 目标用户
    pub following:UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            Profile::PROFILE_PREFIX,
            following.key().as_ref(),
        ],
        bump
    )]
    pub following_profile: Account<'info, Profile>,

    pub system_program: Program<'info, System>,
}

pub fn create_follow(ctx: Context<CreateFollow>) -> Result<()> {
    require!(
        ctx.accounts.follower_profile.key() != ctx.accounts.following_profile.key(),
        SocialError::InvalidFollow
    );
    ctx.accounts.follower_profile.following_count()?;
    ctx.accounts.following_profile.followers_count()?;

    ctx.accounts.follow.set_inner(Follow::new(
        ctx.accounts.follower_profile.key(),
        ctx.accounts.following_profile.key(),
        ctx.accounts.authority.key(),
        ctx.accounts.following.key(),
    ));
    emit!(FollowCreated {
        authority: ctx.accounts.authority.key(),
        follow: ctx.accounts.follow.key(),
        follower_profile: ctx.accounts.follower_profile.key(),
        following_profile: ctx.accounts.following_profile.key(),
        created_at: ctx.accounts.follow.created_at,
    });
    Ok(())
}

pub fn cancel_follow(ctx: Context<CancelFollow>) -> Result<()> {
    require!(
        ctx.accounts.follow.follower_profile_pda == ctx.accounts.follower_profile.key(),
        SocialError::InvalidFollow
    );
    require!(
        ctx.accounts.follow.following_profile_pda == ctx.accounts.following_profile.key(),
        SocialError::InvalidFollow
    );
    ctx.accounts.follower_profile.cancel_following_count()?;
    ctx.accounts.following_profile.cancel_followers_count()?;
    emit!(FollowCanceled {
        authority: ctx.accounts.authority.key(),
        follow: ctx.accounts.follow.key(),
        follower_profile: ctx.accounts.follower_profile.key(),
        following_profile: ctx.accounts.following_profile.key(),
    });
    Ok(())
}
