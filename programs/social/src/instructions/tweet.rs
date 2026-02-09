use crate::state::profile::Profile;
use crate::state::tweet::Tweet;
use anchor_lang::prelude::*;
#[derive(Accounts)]
pub struct CreateTweet<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Tweet::INIT_SPACE,
        seeds = [Tweet::TWEET_PREFIX, profile.key().as_ref(), &profile.tweet_count.to_le_bytes()],
        bump
    )]
    pub tweet: Account<'info, Tweet>,

    #[
      account(
        mut,
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

pub fn create_tweet(ctx: Context<CreateTweet>, content: String) -> Result<()> {
    let tweet = Tweet::new(content, ctx.accounts.authority.key());
    ctx.accounts.tweet.set_inner(tweet);
    ctx.accounts.profile.increment_tweet_count()?;
    Ok(())
}
