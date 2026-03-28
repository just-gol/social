use crate::events::{CommentCreated, CommentDeleted};
use crate::state::comment::Comment;
use crate::state::profile::Profile;
use crate::state::tweet::Tweet;
use anchor_lang::prelude::*;
use crate::errors::SocialError;

#[derive(Accounts)]
pub struct CreateComment<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer=authority,
        space=8+Comment::INIT_SPACE,
        seeds=[
            Comment::COMMENT_PREFIX,
            tweet.key().as_ref(),
            authority.key().as_ref(),
        ],
        bump,
    )]
    pub comment: Account<'info, Comment>,

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
    pub author_profile: Account<'info, Profile>,

    #[account(
        mut,
        seeds = [
            Profile::PROFILE_PREFIX,
            tweet.author.as_ref(),
        ],
        bump
    )]
    pub tweet_profile: Account<'info, Profile>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteComment<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub comment: Account<'info, Comment>,

    #[account(mut)]
    pub tweet: Account<'info, Tweet>,

    #[account(
        mut,
        seeds = [
            Profile::PROFILE_PREFIX,
            tweet.author.as_ref(),
        ],
        bump
    )]
    pub tweet_profile: Account<'info, Profile>,

    pub system_program: Program<'info, System>,
}


pub fn create_comment(ctx: Context<CreateComment>, content: String) -> Result<()> {
    require!(content.len() <= 64, SocialError::ContentTooLong);
    require!(!ctx.accounts.tweet.deleted,SocialError::TweetAlreadyDeleted);
    ctx.accounts.comment.set_inner(Comment::new(
        ctx.accounts.authority.key(),
        content,
        ctx.accounts.tweet.key(),
        ctx.accounts.author_profile.key(),
    ));
    ctx.accounts.tweet.comment()?;
    ctx.accounts.tweet_profile.comments_received_count()?;
    emit!(CommentCreated {
        authority: ctx.accounts.authority.key(),
        author_profile: ctx.accounts.author_profile.key(),
        tweet: ctx.accounts.tweet.key(),
        comment: ctx.accounts.comment.key(),
        created_at: ctx.accounts.comment.created_at,
    });
    Ok(())
}

pub fn delete_comment(ctx: Context<DeleteComment>) -> Result<()> {
    require!(!ctx.accounts.comment.deleted,SocialError::CommentAlreadyDeleted);
    require!(ctx.accounts.comment.tweet_pda == ctx.accounts.tweet.key(), SocialError::InvalidTweetPda);
    require!(ctx.accounts.comment.author == ctx.accounts.authority.key(), SocialError::NotAuthor);
    ctx.accounts.comment.deleted = true;
    ctx.accounts.tweet.subtract_comment()?;
    ctx.accounts.tweet_profile.cancel_comments_received_count()?;
    emit!(CommentDeleted {
        authority: ctx.accounts.authority.key(),
        comment: ctx.accounts.comment.key(),
        tweet: ctx.accounts.tweet.key(),
    });
    Ok(())
}
