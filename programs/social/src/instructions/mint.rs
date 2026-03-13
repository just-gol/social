use crate::state::mint::{NftMint, TokenMint};
use anchor_lang::prelude::*;
use anchor_spl::metadata::mpl_token_metadata::types::DataV2;
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
    CreateMetadataAccountsV3,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::Metadata,
    token_interface::{mint_to, Mint, MintTo, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
#[instruction(code: u8)]
pub struct CreateNftMint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
      init_if_needed,
      payer = authority,
      seeds = [
        NftMint::NFT_MINT_PREFIX,
        &code.to_le_bytes(),
      ],
      bump,
      mint::decimals = 0,
      mint::authority = nft_mint_account,
      mint::freeze_authority = nft_mint_account,
      mint::token_program = token_program,
    )]
    pub nft_mint_account: InterfaceAccount<'info, Mint>,

    #[account(
      init_if_needed,
      payer = authority,
      associated_token::mint = nft_mint_account,
      associated_token::authority = authority,
      associated_token::token_program = token_program,
      )
    ]
    pub nft_associated_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: PDA is derived with token-metadata program + mint seeds, so address validity is enforced by seeds constraints.
    #[account(
      mut,
      seeds=[b"metadata".as_ref(),token_metadata_program.key().as_ref(),nft_mint_account.key().as_ref()],
      bump,
      seeds::program = token_metadata_program
    )]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: PDA is derived with token-metadata program + mint seeds, so address validity is enforced by seeds constraints.
    #[account(
        mut,
        seeds=[b"metadata".as_ref(),token_metadata_program.key().as_ref(),nft_mint_account.key().as_ref(),b"edition".as_ref()],
        bump,
        seeds::program = token_metadata_program.key()
    )]
    pub master_editon_account: UncheckedAccount<'info>,

    pub token_metadata_program: Program<'info, Metadata>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_nft_mint(ctx: Context<CreateNftMint>, code: u8) -> Result<()> {
    let signer_seeds: &[&[&[u8]]] = &[&[
        NftMint::NFT_MINT_PREFIX,
        &code.to_le_bytes(),
        &[ctx.bumps.nft_mint_account],
    ]];
    if ctx.accounts.nft_mint_account.supply == 0 {
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.nft_mint_account.to_account_info(),
                    to: ctx.accounts.nft_associated_token_account.to_account_info(),
                    authority: ctx.accounts.nft_mint_account.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;
    }
    if ctx
        .accounts
        .metadata_account
        .to_account_info()
        .data_is_empty()
    {
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata_account.to_account_info(),
                    mint: ctx.accounts.nft_mint_account.to_account_info(),
                    mint_authority: ctx.accounts.nft_mint_account.to_account_info(),
                    update_authority: ctx.accounts.nft_mint_account.to_account_info(),
                    payer: ctx.accounts.authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: NftMint::NFT_NAME.to_string(),
                symbol: NftMint::NFT_SYMBOL.to_string(),
                uri: "".to_string(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            false,
            true,
            None,
        )?;
    }
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
                signer_seeds,
            ),
            Some(0),
        )?;
    }
    Ok(())
}

#[derive(Accounts)]
pub struct CreateTokenMint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
      init_if_needed,
      payer = authority,
      seeds = [
        TokenMint::TOKEN_MINT_PREFIX,
      ],
      bump,
      mint::decimals = 2,
      mint::authority = token_mint_account,
      mint::freeze_authority = token_mint_account,
    )]
    pub token_mint_account: InterfaceAccount<'info, Mint>,

    #[account(
      init_if_needed,
      payer = authority,
      associated_token::mint = token_mint_account,
      associated_token::authority = authority,
      associated_token::token_program = token_program,
    )]
    pub token_associated_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,
}

pub fn create_token_mint(ctx: Context<CreateTokenMint>) -> Result<()> {
    Ok(())
}
