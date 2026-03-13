use crate::state::reward_config::RewardConfig;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitRewardConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + RewardConfig::INIT_SPACE,
        seeds = [RewardConfig::REWARD_CONFIG_PREFIX, authority.key().as_ref()],
        bump
    )]
    pub reward_config: Account<'info, RewardConfig>,

    pub system_program: Program<'info, System>,
}

pub fn init_reward_config(
    ctx: Context<InitRewardConfig>,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    ctx.accounts.reward_config.set_inner(RewardConfig {
        authority: ctx.accounts.authority.key(),
        name,
        symbol,
        uri,
    });
    Ok(())
}
