use anchor_lang::prelude::*;

declare_id!("9BXzYsCbqFLwTzkqognW18JiZa7DrzhccsifMHSjcwxS");
pub mod instructions;
use instructions::*;
pub mod errors;
pub mod state;
#[program]
pub mod social {
    use super::*;

    pub fn create_profile(ctx: Context<CreateProfile>, username: String) -> Result<()> {
        instructions::create_profile(ctx, username)
    }

    pub fn create_tweet(ctx: Context<CreateTweet>, content: String) -> Result<()> {
        instructions::create_tweet(ctx, content)
    }
    pub fn create_like(ctx: Context<CreateLike>) -> Result<()> {
        instructions::create_like(ctx)
    }

    pub fn create_nft_mint(ctx: Context<CreateNftMint>) -> Result<()> {
        instructions::create_nft_mint(ctx)
    }
}
