use anchor_lang::prelude::*;

use crate::state::like::Like;
use crate::state::profile::Profile;
use crate::state::tweet::Tweet;

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

pub fn create_like(ctx: Context<CreateLike>) -> Result<()> {
    ctx.accounts.tweet.like()?;
    ctx.accounts.like.set_inner(Like::new(
        ctx.accounts.profile.key(),
        ctx.accounts.tweet.key(),
    ));
    Ok(())
}
