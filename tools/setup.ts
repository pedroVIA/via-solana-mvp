/**
 * Setup Chain Workflow
 *
 * Complete system setup for a specific chain.
 * Composes atomic SDK operations into a complete initialization flow.
 */

import { ViaLabsSDK, type ChainId, type RegistryType } from "../packages/via-labs-sdk/src/index.js";

export async function setupChain(chainId: ChainId): Promise<void> {
  const sdk = new ViaLabsSDK();

  console.log(`🚀 Setting up complete infrastructure for chain ${chainId.toString()}`);

  // Initialize gateway
  try {
    await sdk.initializeGateway(chainId);
    console.log("✅ Gateway initialized");
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("⚠️  Gateway already exists");
    } else throw e;
  }

  // Initialize counter
  try {
    await sdk.initializeCounter(chainId);
    console.log("✅ Counter initialized");
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("⚠️  Counter already exists");
    } else throw e;
  }

  // Initialize registries
  const registryTypes: RegistryType[] = ["via", "chain", "project"];
  for (const type of registryTypes) {
    try {
      await sdk.initializeRegistry(type, chainId);
      console.log(`✅ ${type.toUpperCase()} registry initialized`);
    } catch (e: any) {
      if (e.message?.includes("already in use")) {
        console.log(`⚠️  ${type.toUpperCase()} registry already exists`);
      } else throw e;
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { BN } = await import("bn.js");
  const chainId = process.argv[2] ? new BN(process.argv[2]) : new BN("43113");

  setupChain(chainId).catch((error: unknown) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
}