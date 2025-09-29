import { ViaLabsClient, ViaLabsPDAs, SOLANA_CHAIN_ID } from "../client/index.js";
import { BN } from "bn.js";

/**
 * Initialize Signer Registry Script
 *
 * Initializes a signer registry for a specific registry type and chain ID.
 */

class InitializeSignerRegistryExecutor {
  private client: ViaLabsClient;
  private pdas: ViaLabsPDAs;

  constructor() {
    this.client = new ViaLabsClient();
    this.pdas = new ViaLabsPDAs(this.client.program);

    console.log("✅ Initialize Signer Registry initialized:");
    console.log(`   Network: ${process.env.ANCHOR_PROVIDER_URL}`);
    console.log(`   Wallet: ${this.client.wallet.publicKey.toString()}`);
    console.log(`   Program: ${this.client.program.programId.toString()}`);
  }

  /**
   * Initialize signer registry for specific type and chain
   */
  async execute(
    registryType: "via" | "chain" | "project",
    chainId: InstanceType<typeof BN>,
    initialSigners: any[] = [this.client.wallet.publicKey],
    requiredSignatures: number = 0
  ): Promise<void> {
    console.log(`🚀 Initializing ${registryType.toUpperCase()} Signer Registry for chain ${chainId.toString()}...`);

    try {
      const enumObject = registryType === "via" ? { via: {} } :
                        registryType === "chain" ? { chain: {} } :
                        { project: {} };

      const tx = await this.client.program.methods
        .initializeSignerRegistry(
          enumObject, // Anchor enum format
          chainId,
          initialSigners,
          requiredSignatures
        )
        .accountsPartial({
          gateway: this.pdas.getGatewayPda(),
          signerRegistry: this.pdas.getSignerRegistryPdaForChain(registryType, chainId),
          authority: this.client.wallet.publicKey,
        })
        .rpc();

      console.log(`✅ ${registryType.toUpperCase()} Registry initialized: ${tx}`);
      console.log(`   Registry Address: ${this.pdas.getSignerRegistryPdaForChain(registryType, chainId).toString()}`);
      console.log(`   Chain ID: ${chainId.toString()}`);
      console.log(`   Signers: ${initialSigners.length}`);
      console.log(`   Required Signatures: ${requiredSignatures}`);

    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes("already in use") || error.message.includes("0x0"))) {
        console.log(`⚠️  ${registryType.toUpperCase()} Registry already exists for chain ${chainId.toString()}`);
        return;
      }
      console.error(`❌ ${registryType.toUpperCase()} Registry initialization failed:`, error);
      throw error;
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const registryType = (process.argv[2] as "via" | "chain" | "project") || "via";
  const chainId = process.argv[3] ? new BN(process.argv[3]) : SOLANA_CHAIN_ID;
  const requiredSignatures = process.argv[4] ? parseInt(process.argv[4]) : 0;

  const executor = new InitializeSignerRegistryExecutor();
  const client = new ViaLabsClient();
  executor.execute(registryType, chainId, [client.wallet.publicKey], requiredSignatures).catch((error: unknown) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });
}

export default InitializeSignerRegistryExecutor;