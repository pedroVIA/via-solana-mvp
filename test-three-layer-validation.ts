#!/usr/bin/env tsx

/**
 * Test three-layer signature validation with multiple signers
 */

import { ViaLabsSDK, createMessageSignature, createMessageHash } from './packages/via-labs-sdk/src/index.js';
import { Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import fs from 'fs';

async function testThreeLayerValidation() {
  console.log('🧪 Testing three-layer signature validation...\n');

  const sdk = new ViaLabsSDK();

  // Load authority keypair (will be used as VIA signer)
  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('./keypairs/authority.json', 'utf8')))
  );

  // Create additional test signers for different layers
  const chainSigner = Keypair.generate();
  const projectSigner = Keypair.generate();

  console.log('🔑 Authority (VIA) signer:', authorityKeypair.publicKey.toBase58());
  console.log('🔑 Chain signer:', chainSigner.publicKey.toBase58());
  console.log('🔑 Project signer:', projectSigner.publicKey.toBase58());

  const chainId = new BN('43113');

  try {
    // Add signers to respective registries
    console.log('\n🏗️  Setting up registries with multiple signers...');

    // VIA registry already has authority, add chain and project signers
    console.log('   Adding chain signer to chain registry...');
    await sdk.addSigner(
      "chain",
      chainId,
      chainSigner.publicKey
    );

    console.log('   Adding project signer to project registry...');
    await sdk.addSigner(
      "project",
      chainId,
      projectSigner.publicKey
    );

    console.log('✅ Registry setup complete');

    // Create test message
    const txId = new BN(Date.now());
    const sourceChainId = chainId;
    const destChainId = chainId;
    const sender = Buffer.from('test_multi_sender');
    const recipient = Buffer.from(authorityKeypair.publicKey.toBytes());
    const onChainData = Buffer.from('three layer test');
    const offChainData = Buffer.from('');

    // Create signatures from all three layers
    const viaSignature = createMessageSignature(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, authorityKeypair
    );

    const chainSignature = createMessageSignature(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, chainSigner
    );

    const projectSignature = createMessageSignature(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, projectSigner
    );

    const signatures = [viaSignature, chainSignature, projectSignature];

    console.log('\n✍️  Created 3 signatures (VIA + Chain + Project)');
    console.log('  VIA signer:', viaSignature.signer.toBase58());
    console.log('  Chain signer:', chainSignature.signer.toBase58());
    console.log('  Project signer:', projectSignature.signer.toBase58());

    // TX1: Create TxId PDA with all signatures
    console.log('\n🔄 TX1: Creating TxId PDA with three-layer signatures...');
    const tx1 = await sdk.createTxPdaWithSignatures(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures
    );

    console.log('✅ TX1 Success with three-layer validation!');
    console.log(`   🔗 Explorer: https://explorer.solana.com/tx/${tx1}?cluster=devnet`);

    // TX2: Process message with full validation
    console.log('\n🔄 TX2: Processing message with full signature validation...');
    const tx2 = await sdk.processMessageWithSignatures(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures
    );

    console.log('✅ TX2 Success! Full three-layer validation complete!');
    console.log(`   🔗 Explorer: https://explorer.solana.com/tx/${tx2}?cluster=devnet`);

    console.log('\n🎉 Phase 2 Complete: Three-layer signature validation working!');

  } catch (error: any) {
    console.error('\n❌ Three-layer validation test failed:');
    console.error('Error:', error.message);

    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error('  ', log));
    }

    throw error;
  }
}

testThreeLayerValidation().catch((error) => {
  console.error('\nThree-layer validation test failed:', error);
  process.exit(1);
});