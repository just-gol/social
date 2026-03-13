use crate::state::mint::NftMint;
use crate::state::profile::Profile;
use crate::state::reward_config::RewardConfig;
use crate::state::tweet::Tweet;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{mint_to, Mint, MintTo, TokenAccount, TokenInterface};
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

    #[account(
      mut,
      seeds = [
        NftMint::NFT_MINT_PREFIX,
        reward_config.key().as_ref(),
        profile.key().as_ref(),
      ],
      bump,
  )]
    pub nft_mint_account: InterfaceAccount<'info, Mint>,

    #[account()]
    pub reward_config: Account<'info, RewardConfig>,

    #[account(
      init_if_needed,
      payer = authority,
      associated_token::mint = nft_mint_account,
      associated_token::authority = authority,
      associated_token::token_program = token_program,
  )]
    pub author_nft_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

pub fn create_tweet(ctx: Context<CreateTweet>, content: String) -> Result<()> {
    let reward_config_key = ctx.accounts.reward_config.key();
    let profile_key = ctx.accounts.profile.key();
    let tweet = Tweet::new(content, ctx.accounts.authority.key());
    ctx.accounts.tweet.set_inner(tweet);
    ctx.accounts.profile.increment_tweet_count()?;
    if ctx.accounts.profile.reward {
        ctx.accounts.profile.reward = false;
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.nft_mint_account.to_account_info(),
                    to: ctx.accounts.author_nft_account.to_account_info(),
                    authority: ctx.accounts.nft_mint_account.to_account_info(),
                },
                &[&[
                    NftMint::NFT_MINT_PREFIX,
                    reward_config_key.as_ref(),
                    profile_key.as_ref(),
                    &[ctx.bumps.nft_mint_account],
                ]],
            ),
            1,
        )?;
    }
    Ok(())
}
