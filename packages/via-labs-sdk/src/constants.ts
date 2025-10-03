/**
 * Via Labs V4 Constants
 *
 * Centralized constants for the Via Labs cross-chain messaging protocol.
 */

import { BN } from "bn.js";

// Common chain IDs for reference
export const SOLANA_CHAIN_ID = new BN("9999999999999999999");
export const AVALANCHE_CHAIN_ID = new BN("43113");

// Buffer size constants for PDA derivation
export const CHAIN_ID_BYTES = 8;
export const TX_ID_BYTES = 16;