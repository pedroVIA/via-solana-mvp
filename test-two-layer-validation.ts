#!/usr/bin/env tsx

/**
 * Test two-layer signature validation (VIA + Chain)
 * Due to transaction size limits, we test with 2 signatures instead of 3
 */

import { ViaLabsSDK, createMessageSignature } from './packages/via-labs-sdk/src/index.js';
import { Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import fs from 'fs';

async function testTwoLayerValidation() {
  console.log('🧪 Testing two-layer signature validation (VIA + Chain)...\n');

  const sdk = new ViaLabsSDK();

  // Load authority keypair (VIA signer)
  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('./keypairs/authority.json', 'utf8')))
  );

  // Create chain signer
  const chainSigner = Keypair.generate();

  console.log('🔑 Authority (VIA) signer:', authorityKeypair.publicKey.toBase58());
  console.log('🔑 Chain signer:', chainSigner.publicKey.toBase58());

  const chainId = new BN('43113');

  try {
    // Add chain signer to chain registry
    console.log('\n🏗️  Adding chain signer to chain registry...');
    await sdk.addSigner("chain", chainId, chainSigner.publicKey);
    console.log('✅ Registry setup complete');

    // Create test message
    const txId = new BN(Date.now());
    const sourceChainId = chainId;
    const destChainId = chainId;
    const sender = Buffer.from('test_two_layer');
    const recipient = Buffer.from(authorityKeypair.publicKey.toBytes());
    const onChainData = Buffer.from('two layer test');
    const offChainData = Buffer.from('');

    // Create signatures from VIA and Chain layers
    const viaSignature = createMessageSignature(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, authorityKeypair
    );

    const chainSignature = createMessageSignature(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, chainSigner
    );

    const signatures = [viaSignature, chainSignature];

    console.log('\n✍️  Created 2 signatures (VIA + Chain)');
    console.log('  VIA signer:', viaSignature.signer.toBase58());
    console.log('  Chain signer:', chainSignature.signer.toBase58());

    // TX1: Create TxId PDA
    console.log('\n🔄 TX1: Creating TxId PDA with two-layer signatures...');
    const tx1 = await sdk.createTxPdaWithSignatures(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures
    );

    console.log('✅ TX1 Success with two-layer validation!');
    console.log(`   🔗 Explorer: https://explorer.solana.com/tx/${tx1}?cluster=devnet`);

    // TX2: Process message with full validation
    console.log('\n🔄 TX2: Processing message with two-layer signature validation...');
    const tx2 = await sdk.processMessageWithSignatures(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures
    );

    console.log('✅ TX2 Success! Two-layer validation complete!');
    console.log(`   🔗 Explorer: https://explorer.solana.com/tx/${tx2}?cluster=devnet`);

    console.log('\n🎉 Phase 2 Complete: Multi-layer signature validation working!');
    console.log('📋 Transaction size is within limits with 2 signatures');
    console.log('📋 Three-layer validation would require larger transaction support or signature aggregation');

  } catch (error: any) {
    console.error('\n❌ Two-layer validation test failed:');
    console.error('Error:', error.message);

    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error('  ', log));
    }

    throw error;
  }
}

testTwoLayerValidation().catch((error) => {
  console.error('\nTwo-layer validation test failed:', error);
  process.exit(1);
});