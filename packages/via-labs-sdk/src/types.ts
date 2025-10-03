/**
 * Via Labs V4 Core Types
 *
 * Minimal generic type definitions to eliminate repetition across the codebase.
 */

import { BN } from "bn.js";

// Core type aliases to replace repetitive InstanceType<typeof BN>
export type ChainId = InstanceType<typeof BN>;
export type TxId = InstanceType<typeof BN>;
export type RegistryType = "via" | "chain" | "project";

// Core validation utilities for chain IDs and transaction IDs
export function validateChainId(chainId: ChainId): void {
  if (!chainId || chainId.isNeg()) {
    throw new Error(`Invalid chain ID: ${chainId?.toString() ?? 'null'}`);
  }
}

export function validateTxId(txId: TxId): void {
  if (!txId || txId.isNeg()) {
    throw new Error(`Invalid TX ID: ${txId?.toString() ?? 'null'}`);
  }
}