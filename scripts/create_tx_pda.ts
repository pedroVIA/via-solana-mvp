import { ViaLabsClient, ViaLabsPDAs, SOLANA_CHAIN_ID, AVALANCHE_CHAIN_ID } from "../client/index.js";
import { BN } from "bn.js";

/**
 * Create TX PDA Script
 *
 * TX1: Creates TxId PDA for two-transaction replay protection pattern.
 */

class CreateTxPdaExecutor {
  private client: ViaLabsClient;
  private pdas: ViaLabsPDAs;

  constructor() {
    this.client = new ViaLabsClient();
    this.pdas = new ViaLabsPDAs(this.client.program);

    console.log("✅ Create TX PDA initialized:");
    console.log(`   Network: ${process.env.ANCHOR_PROVIDER_URL}`);
    console.log(`   Wallet: ${this.client.wallet.publicKey.toString()}`);
    console.log(`   Program: ${this.client.program.programId.toString()}`);
  }

  /**
   * Create TX PDA for replay protection (TX1 of two-transaction pattern)
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
    console.log(`🚀 Creating TX PDA for replay protection...`);
    console.log(`   TX ID: ${txId.toString()}`);
    console.log(`   Source Chain: ${sourceChainId.toString()}`);
    console.log(`   Dest Chain: ${destChainId.toString()}`);
    console.log(`   Sender: ${new TextDecoder().decode(sender)}`);
    console.log(`   Recipient: ${new TextDecoder().decode(recipient)}`);

    try {
      const tx = await this.client.program.methods
        .createTxPda(
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
          txIdPda: this.pdas.getTxIdPda(sourceChainId, txId),
          counterPda: this.pdas.getCounterPda(sourceChainId),
          relayer: this.client.wallet.publicKey,
        })
        .rpc();

      console.log(`✅ TX PDA created: ${tx}`);
      console.log(`   PDA Address: ${this.pdas.getTxIdPda(sourceChainId, txId).toString()}`);

    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes("already in use") || error.message.includes("0x0"))) {
        console.log("⚠️  TX PDA already exists (replay protection active)");
        return;
      }
      console.error("❌ TX PDA creation failed:", error);
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

  const executor = new CreateTxPdaExecutor();
  executor.execute(txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures).catch((error: unknown) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });
}

export default CreateTxPdaExecutor;