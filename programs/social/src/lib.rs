use anchor_lang::prelude::*;

declare_id!("9BXzYsCbqFLwTzkqognW18JiZa7DrzhccsifMHSjcwxS");
pub mod instructions;
use instructions::*;
pub mod state;
#[program]
pub mod social {
    use super::*;

    pub fn create_profile(ctx: Context<CreateProfile>, username: String) -> Result<()> {
        instructions::create_profile(ctx, username)
    }
}
