/**
 * Via Labs V4 Client Library
 *
 * Main exports for client utilities.
 */

export { ViaLabsClient, createClient } from "./connection.js";
export { ViaLabsPDAs } from "./pdas.js";
export type { ChainId, TxId, RegistryType } from "./types.js";
export { validateChainId, validateTxId } from "./types.js";
export { SOLANA_CHAIN_ID, AVALANCHE_CHAIN_ID, CHAIN_ID_BYTES, TX_ID_BYTES } from "./constants.js";
export { ViaLabsSDK, createSDK, createLocalnetSDK, createDevnetSDK, createMainnetSDK } from "./sdk.js";
export type { MessageSignature } from "./signatures.js";
export {
  createMessageHash,
  createEd25519Instruction,
  signMessage,
  createMessageSignature,
  formatSignaturesForAnchor
} from "./signatures.js";