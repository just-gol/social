use anchor_lang::prelude::*;

use crate::events::ProfileCreated;
use crate::state::profile::Profile;

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[
      account(
        init,
        payer = authority,
        space = 8 + Profile::INIT_SPACE,
        seeds = [
          Profile::PROFILE_PREFIX,
          authority.key().as_ref(),
        ],
        bump
      )
    ]
    pub profile: Account<'info, Profile>,

    pub system_program: Program<'info, System>,
}

pub fn create_profile(
    ctx: Context<CreateProfile>,
    name: String,
    bio: String,
    avatar_uri: String,
) -> Result<()> {
    ctx.accounts
        .profile
        .set_inner(Profile::new(name, bio, avatar_uri));
    emit!(ProfileCreated {
        authority: ctx.accounts.authority.key(),
        profile: ctx.accounts.profile.key(),
    });
    Ok(())
}
