import { ViaLabsClient, ViaLabsPDAs, SOLANA_CHAIN_ID, AVALANCHE_CHAIN_ID } from "../client/index.js";
import { BN } from "bn.js";

/**
 * Process Message Script
 *
 * TX2: Processes incoming message and atomically closes TxId PDA (completes two-transaction pattern).
 */

class ProcessMessageExecutor {
  private client: ViaLabsClient;
  private pdas: ViaLabsPDAs;

  constructor() {
    this.client = new ViaLabsClient();
    this.pdas = new ViaLabsPDAs(this.client.program);

    console.log("✅ Process Message initialized:");
    console.log(`   Network: ${process.env.ANCHOR_PROVIDER_URL}`);
    console.log(`   Wallet: ${this.client.wallet.publicKey.toString()}`);
    console.log(`   Program: ${this.client.program.programId.toString()}`);
  }

  /**
   * Process incoming message and close TX PDA (TX2 of two-transaction pattern)
   */
  async execute(
    txId: InstanceType<typeof BN> = new BN(Date.now()),
    sourceChainId: InstanceType<typeof BN> = AVALANCHE_CHAIN_ID,
    destChainId: InstanceType<typeof BN> = SOLANA_CHAIN_ID,
    sender: Uint8Array = new TextEncoder().encode("0x742d35Cc6634C0532925a3b8D497F87654e3b4c3"),
    recipient: Uint8Array = new TextEncoder().encode("8U4RJCMSKw1xgGmAiRMK7sjiDpYfVgVM49RhZityrwa5"),
    onChainData: Uint8Array = new TextEncoder().encode("Hello from Avalanche!"),
    offChainData: Uint8Array = new TextEncoder().encode("Additional metadata"),
    signatures: any[] = [] // Empty array for testing
  ): Promise<void> {
    console.log(`🚀 Processing message and closing TX PDA...`);
    console.log(`   TX ID: ${txId.toString()}`);
    console.log(`   Source Chain: ${sourceChainId.toString()}`);
    console.log(`   Dest Chain: ${destChainId.toString()}`);
    console.log(`   Sender: ${new TextDecoder().decode(sender)}`);
    console.log(`   Recipient: ${new TextDecoder().decode(recipient)}`);
    console.log(`   PDA to close: ${this.pdas.getTxIdPda(sourceChainId, txId).toString()}`);

    try {
      const tx = await this.client.program.methods
        .processMessage(
          txId,
          sourceChainId,
          destChainId,
          Buffer.from(sender),
          Buffer.from(recipient),
          Buffer.from(onChainData),
          Buffer.from(offChainData),
          signatures
        )
        .accountsPartial({
          gateway: this.pdas.getGatewayPda(),
          txIdPda: this.pdas.getTxIdPda(sourceChainId, txId),
          viaRegistry: this.pdas.getSignerRegistryPdaForChain("via", destChainId), // VIA registry for dest chain
          chainRegistry: this.pdas.getSignerRegistryPdaForChain("chain", sourceChainId), // Chain registry for source chain
          projectRegistry: this.pdas.getSignerRegistryPdaForChain("project", destChainId), // Project registry for dest chain
          relayer: this.client.wallet.publicKey,
        })
        .rpc();

      console.log(`✅ Message processed: ${tx}`);
      console.log(`   TX PDA closed and rent reclaimed`);
      console.log(`   Two-transaction pattern completed successfully`);

    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Account does not exist")) {
        console.log("⚠️  TX PDA doesn't exist (run create_tx_pda first)");
        return;
      }
      console.error("❌ Message processing failed:", error);
      throw error;
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const txId = process.argv[2] ? new BN(process.argv[2]) : new BN(Date.now());
  const sourceChainId = process.argv[3] ? new BN(process.argv[3]) : AVALANCHE_CHAIN_ID;
  const destChainId = process.argv[4] ? new BN(process.argv[4]) : SOLANA_CHAIN_ID;
  const sender = process.argv[5] ? new TextEncoder().encode(process.argv[5]) : new TextEncoder().encode("0x742d35Cc6634C0532925a3b8D497F87654e3b4c3");
  const recipient = process.argv[6] ? new TextEncoder().encode(process.argv[6]) : new TextEncoder().encode("8U4RJCMSKw1xgGmAiRMK7sjiDpYfVgVM49RhZityrwa5");
  const onChainData = process.argv[7] ? new TextEncoder().encode(process.argv[7]) : new TextEncoder().encode("Hello from Avalanche!");
  const offChainData = process.argv[8] ? new TextEncoder().encode(process.argv[8]) : new TextEncoder().encode("Additional metadata");
  const signatures: any[] = []; // Empty for testing

  const executor = new ProcessMessageExecutor();
  executor.execute(txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures).catch((error: unknown) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });
}

export default ProcessMessageExecutor;