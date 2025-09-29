import { ViaLabsClient, ViaLabsPDAs, AVALANCHE_CHAIN_ID } from "../client/index.js";
import { BN } from "bn.js";

/**
 * Send Message Script
 *
 * Sends a cross-chain message through the gateway.
 */

class SendMessageExecutor {
  private client: ViaLabsClient;
  private pdas: ViaLabsPDAs;

  constructor() {
    this.client = new ViaLabsClient();
    this.pdas = new ViaLabsPDAs(this.client.program);

    console.log("✅ Send Message initialized:");
    console.log(`   Network: ${process.env.ANCHOR_PROVIDER_URL}`);
    console.log(`   Wallet: ${this.client.wallet.publicKey.toString()}`);
    console.log(`   Program: ${this.client.program.programId.toString()}`);
  }

  /**
   * Send cross-chain message
   */
  async execute(
    txId: InstanceType<typeof BN> = new BN(Date.now()),
    recipient: Uint8Array = new TextEncoder().encode("0x742d35Cc6634C0532925a3b8D497F87654e3b4c3"),
    destChainId: InstanceType<typeof BN> = AVALANCHE_CHAIN_ID,
    chainData: Uint8Array = new TextEncoder().encode("Hello cross-chain world!"),
    confirmations: number = 1
  ): Promise<void> {
    console.log(`🚀 Sending message to chain ${destChainId.toString()}...`);
    console.log(`   TX ID: ${txId.toString()}`);
    console.log(`   Recipient: ${new TextDecoder().decode(recipient)}`);
    console.log(`   Data: ${new TextDecoder().decode(chainData)}`);

    try {
      const tx = await this.client.program.methods
        .sendMessage(
          txId,
          Buffer.from(recipient),
          destChainId,
          Buffer.from(chainData),
          confirmations
        )
        .accountsPartial({
          gateway: this.pdas.getGatewayPda(),
          sender: this.client.wallet.publicKey,
        })
        .rpc();

      console.log(`✅ Message sent: ${tx}`);

    } catch (error: unknown) {
      console.error("❌ Message sending failed:", error);
      throw error;
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const txId = process.argv[2] ? new BN(process.argv[2]) : new BN(Date.now());
  const recipient = process.argv[3] ? new TextEncoder().encode(process.argv[3]) : new TextEncoder().encode("0x742d35Cc6634C0532925a3b8D497F87654e3b4c3");
  const destChainId = process.argv[4] ? new BN(process.argv[4]) : AVALANCHE_CHAIN_ID;
  const chainData = process.argv[5] ? new TextEncoder().encode(process.argv[5]) : new TextEncoder().encode("Hello cross-chain world!");
  const confirmations = process.argv[6] ? parseInt(process.argv[6]) : 1;

  const executor = new SendMessageExecutor();
  executor.execute(txId, recipient, destChainId, chainData, confirmations).catch((error: unknown) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });
}

export default SendMessageExecutor;