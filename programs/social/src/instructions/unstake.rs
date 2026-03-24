use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::transfer_checked,
    token_interface::{mint_to, Mint, MintTo, TokenAccount, TokenInterface},
};

use crate::{
    errors::SocialError,
    events::{RewardIssued, RewardKind, StakeClosed},
    state::{
        mint::{NftMint, TokenMint},
        profile::Profile,
        reward_config::RewardConfig,
        stake::Stake,
    },
};

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
      mut,
      close = authority,
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
        NftMint::NFT_MINT_PREFIX,
        reward_config.key().as_ref(),
        profile.key().as_ref(),
      ],
      bump,
  )]
    pub nft_mint_account: InterfaceAccount<'info, Mint>,

    #[account(
      mut,
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

    #[account(
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
      associated_token::authority = authority,
      associated_token::token_program = token_program,
  )]
    pub authority_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,
}

pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
    require!(
        ctx.accounts.stake.authority.key() == ctx.accounts.authority.key(),
        SocialError::InvalidStakeAuthority
    );
    require!(
        ctx.accounts.stake.mint.key() == ctx.accounts.nft_mint_account.key(),
        SocialError::InvalidStakeMint
    );
    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::TransferChecked {
                from: ctx
                    .accounts
                    .stake_associated_token_account
                    .to_account_info(),
                mint: ctx.accounts.nft_mint_account.to_account_info(),
                to: ctx.accounts.authority_nft_account.to_account_info(),
                authority: ctx.accounts.stake.to_account_info(),
            },
        )
        .with_signer(&[&[
            Stake::STAKE_PREFIX,
            ctx.accounts.authority.key().as_ref(),
            ctx.accounts.nft_mint_account.key().as_ref(),
            &[ctx.bumps.stake],
        ]]),
        1,
        0,
    )?;

    let current_epoch = Clock::get()?.epoch;
    let elapsed_epochs = current_epoch.saturating_sub(ctx.accounts.stake.at);
    let reward_amount = ctx
        .accounts
        .reward_config
        .stake_base_reward_amount
        .checked_add(
            elapsed_epochs.saturating_mul(ctx.accounts.reward_config.stake_reward_per_epoch),
        )
        .ok_or(SocialError::RewardAmountOverflow)?;

    if reward_amount > 0 {
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.token_mint_account.to_account_info(),
                    to: ctx.accounts.authority_token_account.to_account_info(),
                    authority: ctx.accounts.token_mint_account.to_account_info(),
                },
                &[&[
                    TokenMint::TOKEN_MINT_PREFIX,
                    &[ctx.bumps.token_mint_account],
                ]],
            ),
            reward_amount,
        )?;
        ctx.accounts.profile.add_token_rewards(reward_amount)?;
        emit!(RewardIssued {
            recipient: ctx.accounts.authority.key(),
            reference: ctx.accounts.stake.key(),
            reward_kind: RewardKind::StakeToken,
            amount: reward_amount,
        });
    }

    emit!(StakeClosed {
        authority: ctx.accounts.authority.key(),
        stake: ctx.accounts.stake.key(),
        mint: ctx.accounts.nft_mint_account.key(),
        reward_amount,
        elapsed_epochs,
    });
    Ok(())
}
