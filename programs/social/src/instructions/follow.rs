use crate::errors::SocialError;
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
    pub followers_profile: Account<'info, Profile>,

    #[account(mut)]
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
            follow.key().as_ref(),
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
    pub followers_profile: Account<'info, Profile>,

    #[account(mut)]
    pub following_profile: Account<'info, Profile>,

    pub system_program: Program<'info, System>,
}

pub fn create_follow(ctx: Context<CreateFollow>) -> Result<()> {
    require!(
        ctx.accounts.followers_profile.key() != ctx.accounts.following_profile.key(),
        SocialError::InvalidFollow
    );
    ctx.accounts.followers_profile.following_count()?;
    ctx.accounts.following_profile.followers_count()?;

    ctx.accounts.follow.set_inner(Follow::new(
        ctx.accounts.followers_profile.key(),
        ctx.accounts.following_profile.key(),
    ));
    Ok(())
}

pub fn cancel_follow(ctx: Context<CancelFollow>) -> Result<()> {
    require!(
        ctx.accounts.follow.follower_profile_pda == ctx.accounts.followers_profile.key(),
        SocialError::InvalidFollow
    );
    require!(
        ctx.accounts.follow.following_profile_pda == ctx.accounts.following_profile.key(),
        SocialError::InvalidFollow
    );
    ctx.accounts.followers_profile.cancel_following_count()?;
    ctx.accounts.following_profile.cancel_followers_count()?;
    Ok(())
}
