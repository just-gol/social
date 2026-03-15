use crate::state::mint::NftMint;
use crate::state::profile::Profile;
use crate::state::reward_config::RewardConfig;
use crate::state::tweet::Tweet;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{create_master_edition_v3, CreateMasterEditionV3, Metadata};
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

    /// CHECK: PDA is derived with token-metadata program + mint seeds, so address validity is enforced by seeds constraints.
    #[account(
          mut,
          seeds=[b"metadata".as_ref(),token_metadata_program.key().as_ref(),nft_mint_account.key().as_ref(),b"edition".as_ref()],
          bump,
          seeds::program = token_metadata_program.key()
      )]
    pub master_editon_account: UncheckedAccount<'info>,

    /// CHECK: PDA is derived with token-metadata program + mint seeds, so address validity is enforced by seeds constraints.
    #[account(
        mut,
        seeds=[b"metadata".as_ref(),token_metadata_program.key().as_ref(),nft_mint_account.key().as_ref()],
        bump,
        seeds::program = token_metadata_program
      )]
    pub metadata_account: UncheckedAccount<'info>,

    pub token_metadata_program: Program<'info, Metadata>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
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

        if ctx
            .accounts
            .master_editon_account
            .to_account_info()
            .data_is_empty()
        {
            create_master_edition_v3(
                CpiContext::new_with_signer(
                    ctx.accounts.token_metadata_program.to_account_info(),
                    CreateMasterEditionV3 {
                        edition: ctx.accounts.master_editon_account.to_account_info(),
                        mint: ctx.accounts.nft_mint_account.to_account_info(),
                        update_authority: ctx.accounts.nft_mint_account.to_account_info(),
                        mint_authority: ctx.accounts.nft_mint_account.to_account_info(),
                        payer: ctx.accounts.authority.to_account_info(),
                        metadata: ctx.accounts.metadata_account.to_account_info(),
                        token_program: ctx.accounts.token_program.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                        rent: ctx.accounts.rent.to_account_info(),
                    },
                    &[&[
                        NftMint::NFT_MINT_PREFIX,
                        reward_config_key.as_ref(),
                        profile_key.as_ref(),
                        &[ctx.bumps.nft_mint_account],
                    ]],
                ),
                Some(0),
            )?;
        }
    }
    Ok(())
}
