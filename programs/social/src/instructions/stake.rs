use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        mint_to, transfer_checked, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
    },
};

use crate::{
    errors::SocialError,
    state::{
        mint::{NftMint, TokenMint},
        profile::Profile,
        reward_config::RewardConfig,
        stake::Stake,
        tweet::Tweet,
    },
};

#[derive(Accounts)]
pub struct CreateStake<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
      init,
      payer = authority,
      space = 8 + Stake::INIT_SPACE,
      seeds = [
        Stake::STAKE_PREFIX,
        authority.key().as_ref(),
        nft_mint_account.key().as_ref(),
      ],
      bump
    )]
    pub stake: Account<'info, Stake>,

    #[account(
      mut,
      constraint = tweet.author == authority.key() @ SocialError::InvalidTweetAuthor
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

    #[account(
      init_if_needed,
      payer = authority,
      associated_token::mint = nft_mint_account,
      associated_token::authority = stake,
      associated_token::token_program = token_program,
      )
    ]
    pub stake_associated_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
      mut,
      associated_token::mint = nft_mint_account,
      associated_token::authority = authority,
      associated_token::token_program = token_program,
    )]
    pub authority_nft_account: InterfaceAccount<'info, TokenAccount>,

    #[account()]
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

    /// CHECK: constrained by `address = tweet.author`
    #[account(address = tweet.author)]
    pub author: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,
}

pub fn create_stake(ctx: Context<CreateStake>) -> Result<()> {
    require!(
        ctx.accounts.nft_mint_account.supply == 1,
        SocialError::NftMintNotMinted
    );

    ctx.accounts.stake.set_inner(Stake::new(
        ctx.accounts.authority.key(),
        ctx.accounts.nft_mint_account.key(),
    ));

    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.authority_nft_account.to_account_info(),
                mint: ctx.accounts.nft_mint_account.to_account_info(),
                to: ctx
                    .accounts
                    .stake_associated_token_account
                    .to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        1,
        0,
    )?;
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
        10000,
    )?;

    Ok(())
}
