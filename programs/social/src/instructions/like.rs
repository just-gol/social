use crate::state::like::Like;
use crate::state::nft_mint::NftMint;
use crate::state::profile::Profile;
use crate::state::tweet::Tweet;
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

    #[account(
        mut,
        seeds = [NftMint::NFT_MINT_PREFIX],
        bump,
    )]
    pub nft_mint_account: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = nft_mint_account,
        associated_token::authority = author_wallet,
        associated_token::token_program = token_program,
    )]
    pub author_token_account: InterfaceAccount<'info, TokenAccount>,

    ///CHECK
    pub author_wallet: AccountInfo<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn create_like(ctx: Context<CreateLike>) -> Result<()> {
    ctx.accounts.tweet.like()?;
    ctx.accounts.like.set_inner(Like::new(
        ctx.accounts.profile.key(),
        ctx.accounts.tweet.key(),
    ));
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.nft_mint_account.to_account_info(),
                to: ctx.accounts.author_token_account.to_account_info(),
                authority: ctx.accounts.nft_mint_account.to_account_info(),
            },
            &[&[b"mint", &[ctx.bumps.nft_mint_account]]],
        ),
        1,
    )?;
    Ok(())
}
