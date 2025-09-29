use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::GatewayError;
use crate::events::CounterInitialized;
use crate::state::{CounterPDA, MessageGateway};

/// Maximum supported chain ID (u64::MAX)
const MAX_SUPPORTED_CHAIN_ID: u64 = 18446744073709551615;

/// Initializes a counter PDA for tracking processed transaction IDs from a source chain.
///
/// ## Security Considerations
/// - Only gateway authority can initialize counters
/// - Counter PDAs are created per source chain to track message sequence
/// - Uses `init` constraint to prevent re-initialization attacks
/// - Validates chain ID is within reasonable bounds
///
/// ## Parameters
/// - `source_chain_id`: The blockchain ID to track messages from (must be > 0 and <= MAX_SUPPORTED_CHAIN_ID)
pub fn handler(
    ctx: Context<InitializeCounter>,
    source_chain_id: u64,
) -> Result<()> {
    // Validate chain ID bounds
    require!(
        source_chain_id > 0 && source_chain_id <= MAX_SUPPORTED_CHAIN_ID,
        GatewayError::InvalidChainId
    );

    // Cache keys to avoid multiple accesses (saves compute units)
    let counter_pda_key = ctx.accounts.counter_pda.key();
    let authority_key = ctx.accounts.authority.key();
    let gateway_key = ctx.accounts.gateway.key();

    // Initialize counter state
    let counter = &mut ctx.accounts.counter_pda;
    counter.source_chain_id = source_chain_id;
    counter.highest_tx_id_seen = 0;
    counter.bump = ctx.bumps.counter_pda;

    // Emit initialization event
    emit!(CounterInitialized {
        source_chain_id,
        counter_pda: counter_pda_key,
        authority: authority_key,
        gateway: gateway_key,
        highest_tx_id_seen: 0, // Always 0 on initialization
    });

    msg!(
        "Counter PDA initialized: chain_id={}, pda={}, authority={}, gateway={}, highest_tx=0",
        source_chain_id,
        counter_pda_key,
        authority_key,
        gateway_key
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(source_chain_id: u64)]
pub struct InitializeCounter<'info> {
    // CRITICAL: Using init (NOT init_if_needed) to prevent overwrites
    // This will FAIL if counter already exists - intentional safety
    #[account(
        init,
        payer = authority,
        space = 8 + CounterPDA::SIZE,
        seeds = [
            COUNTER_SEED,
            source_chain_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub counter_pda: Account<'info, CounterPDA>,
    
    // Gateway authority - only they can initialize counters
    #[account(
        mut,
        constraint = authority.key() == gateway.authority @ GatewayError::UnauthorizedAccess
    )]
    pub authority: Signer<'info>,
    
    // Gateway account to verify authority
    // The gateway's chain_id represents the destination chain for this deployment
    #[account(
        seeds = [GATEWAY_SEED, gateway.chain_id.to_le_bytes().as_ref()],
        bump = gateway.bump,
        constraint = gateway.system_enabled @ GatewayError::GatewayDisabled
    )]
    pub gateway: Account<'info, MessageGateway>,
    
    pub system_program: Program<'info, System>,
}