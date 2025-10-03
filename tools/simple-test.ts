#!/usr/bin/env npx tsx

/**
 * Simple SDK Test - Execute Each Function and Show TX Hash
 */

import { ViaLabsSDK, AVALANCHE_CHAIN_ID, SOLANA_CHAIN_ID } from "../packages/via-labs-sdk/src/index.js";
import { BN } from "bn.js";

const sdk = new ViaLabsSDK();
const chainId = AVALANCHE_CHAIN_ID;
const txId = new BN(Date.now());

console.log("🧪 Simple SDK Test Starting...");
console.log(`Wallet: ${sdk.wallet.toString()}\n`);

try {
  // 1. Initialize Gateway
  console.log("1. Testing initializeGateway...");
  try {
    const tx1 = await sdk.initializeGateway(chainId);
    console.log(`✅ initializeGateway: ${tx1}`);
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }


  // 2. Set System Enabled
  console.log("\n2. Testing setSystemEnabled...");
  try {
    const tx2 = await sdk.setSystemEnabled(chainId, true);
    console.log(`✅ setSystemEnabled: ${tx2}`);
  } catch (error: any) {
    console.log(`❌ setSystemEnabled error: ${error.message}`);
  }

  // 3. Initialize Counter
  console.log("\n3. Testing initializeCounter...");
  try {
    const tx3 = await sdk.initializeCounter(chainId);
    console.log(`✅ initializeCounter: ${tx3}`);
  } catch (error: any) {
    console.log(`❌ initializeCounter error: ${error.message}`);
  }

  // 4. Initialize Registry
  console.log("\n4. Testing initializeRegistry...");
  try {
    const tx4 = await sdk.initializeRegistry("via", chainId, [sdk.wallet], 0);
    console.log(`✅ initializeRegistry: ${tx4}`);
  } catch (error: any) {
    console.log(`❌ initializeRegistry error: ${error.message}`);
  }

  // 5. Add Signer
  console.log("\n5. Testing addSigner...");
  try {
    const tx5 = await sdk.addSigner("via", chainId, sdk.wallet);
    console.log(`✅ addSigner: ${tx5}`);
  } catch (error: any) {
    console.log(`❌ addSigner error: ${error.message}`);
  }

  // 6. Update Threshold
  console.log("\n6. Testing updateThreshold...");
  try {
    const tx6 = await sdk.updateThreshold("via", chainId, 0);
    console.log(`✅ updateThreshold: ${tx6}`);
  } catch (error: any) {
    console.log(`❌ updateThreshold error: ${error.message}`);
  }

  // 7. Update Signers
  console.log("\n7. Testing updateSigners...");
  try {
    const tx7 = await sdk.updateSigners("via", chainId, [sdk.wallet], 0);
    console.log(`✅ updateSigners: ${tx7}`);
  } catch (error: any) {
    console.log(`❌ updateSigners error: ${error.message}`);
  }

  // 8. Set Registry Enabled
  console.log("\n8. Testing setRegistryEnabled...");
  try {
    const tx8 = await sdk.setRegistryEnabled("via", chainId, true);
    console.log(`✅ setRegistryEnabled: ${tx8}`);
  } catch (error: any) {
    console.log(`❌ setRegistryEnabled error: ${error.message}`);
  }

  // 9. Send Message
  console.log("\n9. Testing sendMessage...");
  try {
    const tx9 = await sdk.sendMessage({
      txId: txId,
      recipient: Buffer.from(sdk.wallet.toString()),
      destChainId: chainId,
      chainData: Buffer.from("Hello!"),
      confirmations: 1
    });
    console.log(`✅ sendMessage: ${tx9}`);
  } catch (error: any) {
    console.log(`❌ sendMessage error: ${error.message}`);
  }

  // 10. Create TX PDA
  console.log("\n10. Testing createTxPda...");
  try {
    const uniqueTxId = new BN(Date.now() + 1000);
    const tx10 = await sdk.createTxPda(
      uniqueTxId,
      AVALANCHE_CHAIN_ID,
      SOLANA_CHAIN_ID,
      Buffer.from("0x123"),
      Buffer.from(sdk.wallet.toString()),
      Buffer.from("test"),
      Buffer.from("meta"),
      []
    );
    console.log(`✅ createTxPda: ${tx10}`);
  } catch (error: any) {
    console.log(`❌ createTxPda error: ${error.message}`);
  }

  // 11. Process Message
  console.log("\n11. Testing processMessage...");
  try {
    const uniqueTxId2 = new BN(Date.now() + 2000);
    // First create the PDA for this test
    await sdk.createTxPda(
      uniqueTxId2,
      AVALANCHE_CHAIN_ID,
      SOLANA_CHAIN_ID,
      Buffer.from("0x123"),
      Buffer.from(sdk.wallet.toString()),
      Buffer.from("test"),
      Buffer.from("meta"),
      []
    );
    // Then process the message
    const tx11 = await sdk.processMessage(
      uniqueTxId2,
      AVALANCHE_CHAIN_ID,
      SOLANA_CHAIN_ID,
      Buffer.from("0x123"),
      Buffer.from(sdk.wallet.toString()),
      Buffer.from("test"),
      Buffer.from("meta"),
      []
    );
    console.log(`✅ processMessage: ${tx11}`);
  } catch (error: any) {
    console.log(`❌ processMessage error: ${error.message}`);
  }

  // 12. Remove Signer (test last)
  console.log("\n12. Testing removeSigner...");
  try {
    const tx12 = await sdk.removeSigner("via", chainId, sdk.wallet);
    console.log(`✅ removeSigner: ${tx12}`);
  } catch (error: any) {
    console.log(`❌ removeSigner error: ${error.message}`);
  }

  console.log("\n🎉 ALL 12 SDK FUNCTIONS TESTED!");

} catch (error: any) {
  console.log(`❌ Error: ${error.message}`);
  process.exit(1);
}