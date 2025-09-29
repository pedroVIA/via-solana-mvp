import { ViaLabsClient, ViaLabsPDAs, SOLANA_CHAIN_ID, AVALANCHE_CHAIN_ID } from "../client/index.js";
import InitializeGatewayExecutor from "./initialize_gateway.js";

/**
 * Brutally Competent Setup Script
 *
 * Industry-standard Anchor setup following documentation best practices:
 * - Modular client and PDA utilities
 * - Separate transactions for safety
 * - Proper error handling and validation
 * - Chain ID configuration: Solana destination (9999999999999999999), Avalanche source (43113)
 */

class SetupExecutor {
  private client: ViaLabsClient;
  private pdas: ViaLabsPDAs;

  constructor() {
    // Initialize modular client and PDA utilities
    this.client = new ViaLabsClient();
    this.pdas = new ViaLabsPDAs(this.client.program);

    console.log("✅ Setup initialized:");
    console.log(`   Network: ${process.env.ANCHOR_PROVIDER_URL}`);
    console.log(`   Wallet: ${this.client.wallet.publicKey.toString()}`);
    console.log(`   Program: ${this.client.program.programId.toString()}`);
  }

  /**
   * TX1: Initialize Gateway (Using dedicated executor)
   */
  async initializeGateway(): Promise<void> {
    const gatewayExecutor = new InitializeGatewayExecutor();
    await gatewayExecutor.execute(SOLANA_CHAIN_ID);
  }

  /**
   * TX2: Initialize Counter for Avalanche (Industry Standard Mixed Approach)
   *
   * Industry standard: Manual specification only for cross-dependent accounts that
   * Anchor cannot auto-resolve, while letting Anchor handle the rest automatically.
   */
  async initializeCounter(): Promise<void> {
    console.log("🚀 Initializing Counter for Avalanche...");

    try {
      const tx = await this.client.program.methods
        .initializeCounter(AVALANCHE_CHAIN_ID)
        .accountsPartial({
          // Only specify cross-dependent accounts that Anchor cannot auto-resolve
          gateway: this.pdas.getGatewayPda(),  // Required for authority validation constraint
          authority: this.client.wallet.publicKey,
          // Let Anchor auto-resolve: counter_pda, system_program
        })
        .rpc();

      console.log(`✅ Counter initialized: ${tx}`);

    } catch (error: unknown) {
      // Handle account already exists gracefully (idempotent behavior)
      if (error instanceof Error && (error.message.includes("already in use") || error.message.includes("0x0"))) {
        console.log("⚠️  Counter already exists");
        return;
      }
      console.error("❌ Counter initialization failed:", error);
      throw error;
    }
  }

  /**
   * TX3: Initialize VIA Signer Registry (Industry Standard Mixed Approach)
   */
  async initializeViaRegistry(): Promise<void> {
    console.log("🚀 Initializing VIA Signer Registry...");

    try {
      const tx = await this.client.program.methods
        .initializeSignerRegistry(
          { via: {} },                 // Anchor handles enum discriminant automatically
          SOLANA_CHAIN_ID,
          [this.client.wallet.publicKey],     // Need at least one signer (program requirement)
          0                            // Threshold 0
        )
        .accountsPartial({
          // Specify both cross-dependent accounts that Anchor cannot auto-resolve
          gateway: this.pdas.getGatewayPda(),                    // Required for authority validation constraint
          signerRegistry: this.pdas.getSignerRegistryPda("via"), // Required for enum-dependent PDA derivation
          authority: this.client.wallet.publicKey,
          // Let Anchor auto-resolve: system_program
        })
        .rpc();

      console.log(`✅ VIA Registry initialized: ${tx}`);

    } catch (error: unknown) {
      // Handle account already exists gracefully (idempotent behavior)
      if (error instanceof Error && (error.message.includes("already in use") || error.message.includes("0x0"))) {
        console.log("⚠️  VIA Registry already exists");
        return;
      }
      console.error("❌ VIA Registry initialization failed:", error);
      throw error;
    }
  }

  /**
   * TX4: Initialize Chain Signer Registry (Industry Standard Mixed Approach)
   */
  async initializeChainRegistry(): Promise<void> {
    console.log("🚀 Initializing Chain Signer Registry...");

    try {
      const tx = await this.client.program.methods
        .initializeSignerRegistry(
          { chain: {} },               // Anchor handles enum discriminant automatically
          SOLANA_CHAIN_ID,
          [this.client.wallet.publicKey],     // Need at least one signer (program requirement)
          0                            // Threshold 0
        )
        .accountsPartial({
          // Specify both cross-dependent accounts that Anchor cannot auto-resolve
          gateway: this.pdas.getGatewayPda(),                      // Required for authority validation constraint
          signerRegistry: this.pdas.getSignerRegistryPda("chain"), // Required for enum-dependent PDA derivation
          authority: this.client.wallet.publicKey,
          // Let Anchor auto-resolve: system_program
        })
        .rpc();

      console.log(`✅ Chain Registry initialized: ${tx}`);

    } catch (error: unknown) {
      // Handle account already exists gracefully (idempotent behavior)
      if (error instanceof Error && (error.message.includes("already in use") || error.message.includes("0x0"))) {
        console.log("⚠️  Chain Registry already exists");
        return;
      }
      console.error("❌ Chain Registry initialization failed:", error);
      throw error;
    }
  }

  /**
   * TX5: Initialize Project Signer Registry (Industry Standard Mixed Approach)
   */
  async initializeProjectRegistry(): Promise<void> {
    console.log("🚀 Initializing Project Signer Registry...");

    try {
      const tx = await this.client.program.methods
        .initializeSignerRegistry(
          { project: {} },             // Anchor handles enum discriminant automatically
          SOLANA_CHAIN_ID,
          [this.client.wallet.publicKey],     // Need at least one signer (program requirement)
          0                            // Threshold 0
        )
        .accountsPartial({
          // Specify both cross-dependent accounts that Anchor cannot auto-resolve
          gateway: this.pdas.getGatewayPda(),                      // Required for authority validation constraint
          signerRegistry: this.pdas.getSignerRegistryPda("project"), // Required for enum-dependent PDA derivation
          authority: this.client.wallet.publicKey,
          // Let Anchor auto-resolve: system_program
        })
        .rpc();

      console.log(`✅ Project Registry initialized: ${tx}`);

    } catch (error: unknown) {
      // Handle account already exists gracefully (idempotent behavior)
      if (error instanceof Error && (error.message.includes("already in use") || error.message.includes("0x0"))) {
        console.log("⚠️  Project Registry already exists");
        return;
      }
      console.error("❌ Project Registry initialization failed:", error);
      throw error;
    }
  }

  /**
   * Execute complete setup with separate transactions
   */
  async run(): Promise<void> {
    console.log("\n🔥 Via Labs V4 Message Gateway Setup");
    console.log("=====================================");
    console.log(`Destination Chain: Solana (${SOLANA_CHAIN_ID.toString()})`);
    console.log(`Source Chain: Avalanche (${AVALANCHE_CHAIN_ID.toString()})`);
    console.log("Signer Configuration: Single dummy signer (wallet), threshold 0\n");

    try {
      // Separate transactions for safety and clarity
      await this.initializeGateway();
      await this.initializeCounter();
      await this.initializeViaRegistry();
      await this.initializeChainRegistry();
      await this.initializeProjectRegistry();

      console.log("\n🎉 Setup completed successfully!");
      console.log("All core components initialized and ready for cross-chain messaging.");

    } catch (error: unknown) {
      console.error("\n💥 Setup failed:", error);
      process.exit(1);
    }
  }
}

// Execute setup if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new SetupExecutor();
  setup.run().catch((error: unknown) => {
    console.error("Setup execution failed:", error);
    process.exit(1);
  });
}

export default SetupExecutor;