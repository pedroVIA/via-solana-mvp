import { ViaLabsClient, ViaLabsPDAs, SOLANA_CHAIN_ID } from "../client/index.js";
import { BN } from "bn.js";

/**
 * Initialize Gateway Script
 *
 * Initializes a message gateway for a specific chain ID.
 */

class InitializeGatewayExecutor {
  private client: ViaLabsClient;
  private pdas: ViaLabsPDAs;

  constructor() {
    this.client = new ViaLabsClient();
    this.pdas = new ViaLabsPDAs(this.client.program);

    console.log("✅ Initialize Gateway initialized:");
    console.log(`   Network: ${process.env.ANCHOR_PROVIDER_URL}`);
    console.log(`   Wallet: ${this.client.wallet.publicKey.toString()}`);
    console.log(`   Program: ${this.client.program.programId.toString()}`);
  }

  /**
   * Initialize Gateway
   */
  async execute(chainId: InstanceType<typeof BN> = SOLANA_CHAIN_ID): Promise<void> {
    console.log(`🚀 Initializing Gateway for chain ${chainId.toString()}...`);

    try {
      const tx = await this.client.program.methods
        .initializeGateway(chainId)
        .rpc();

      console.log(`✅ Gateway initialized: ${tx}`);

    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes("already in use") || error.message.includes("0x0"))) {
        console.log("⚠️  Gateway already exists");
        return;
      }
      console.error("❌ Gateway initialization failed:", error);
      throw error;
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const chainId = process.argv[2] ? new BN(process.argv[2]) : SOLANA_CHAIN_ID;

  const executor = new InitializeGatewayExecutor();
  executor.execute(chainId).catch((error: unknown) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });
}

export default InitializeGatewayExecutor;