/**
 * Two-Transaction Message Flow
 *
 * Demonstrates the complete cross-chain message flow with replay protection.
 * TX1: Create TxId PDA for replay protection
 * TX2: Process message and atomically close PDA
 */

import { ViaLabsSDK, type ChainId, type TxId } from "../src/index.js";

export interface MessageFlowParams {
  txId: TxId;
  sourceChainId: ChainId;
  destChainId: ChainId;
  sender: Buffer;
  recipient: Buffer;
  onChainData: Buffer;
  offChainData: Buffer;
  signatures?: any[];
}

export async function sendAndProcessMessage(
  params: MessageFlowParams
): Promise<{ createTx: string; processTx: string }> {
  const sdk = new ViaLabsSDK();

  console.log(`🚀 Executing two-transaction message flow for TX ID ${params.txId.toString()}`);

  // TX1: Create TxId PDA
  const createTx = await sdk.createTxPda(
    params.txId,
    params.sourceChainId,
    params.destChainId,
    params.sender,
    params.recipient,
    params.onChainData,
    params.offChainData,
    params.signatures || []
  );
  console.log(`✅ TX1 complete: ${createTx}`);

  // TX2: Process message
  const processTx = await sdk.processMessage(
    params.txId,
    params.sourceChainId,
    params.destChainId,
    params.sender,
    params.recipient,
    params.onChainData,
    params.offChainData,
    params.signatures || []
  );
  console.log(`✅ TX2 complete: ${processTx}`);

  return { createTx, processTx };
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { BN } = await import("bn.js");
  const { SOLANA_CHAIN_ID, AVALANCHE_CHAIN_ID } = await import("../src/index.js");

  const params: MessageFlowParams = {
    txId: new BN(Date.now()),
    sourceChainId: AVALANCHE_CHAIN_ID,
    destChainId: SOLANA_CHAIN_ID,
    sender: Buffer.from("0x742d35Cc6634C0532925a3b8D497F87654e3b4c3"),
    recipient: Buffer.from("8U4RJCMSKw1xgGmAiRMK7sjiDpYfVgVM49RhZityrwa5"),
    onChainData: Buffer.from("Hello from Avalanche!"),
    offChainData: Buffer.from("Additional metadata"),
    signatures: []
  };

  sendAndProcessMessage(params).catch((error: unknown) => {
    console.error("Message flow failed:", error);
    process.exit(1);
  });
}