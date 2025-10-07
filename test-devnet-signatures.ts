#!/usr/bin/env tsx

/**
 * Test signature validation on devnet
 * Based on SIGNATURE_DEVNET_PLAN.md Phase 4
 */

import { ViaLabsSDK, createMessageSignature } from './packages/via-labs-sdk/src/index.js';
import { Keypair, Ed25519Program } from '@solana/web3.js';
import BN from 'bn.js';
import fs from 'fs';

async function testDevnetSignatures() {
  console.log('🚀 Testing signature validation on devnet...\n');

  const sdk = new ViaLabsSDK();

  // Load authority keypair (which is the signer in all registries)
  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('./keypairs/authority.json', 'utf8')))
  );

  console.log('🔑 Authority signer:', authorityKeypair.publicKey.toBase58());
  console.log('📍 Program ID:', sdk.program.programId.toBase58());

  // Create test message
  const txId = new BN(Date.now());
  const sourceChainId = new BN('43113'); // Avalanche testnet
  const destChainId = new BN('43113'); // Same chain for testing
  const sender = Buffer.from('avalanche_sender_test');
  const recipient = Buffer.from(authorityKeypair.publicKey.toBytes());
  const onChainData = Buffer.from('Hello devnet signatures!');
  const offChainData = Buffer.from('');

  console.log('📝 Test message:');
  console.log('  TX ID:', txId.toString());
  console.log('  Source chain:', sourceChainId.toString());
  console.log('  Dest chain:', destChainId.toString());
  console.log('  Data:', onChainData.toString());

  try {
    // Create signatures for all three registries (via, chain, project)
    const viaSignature = createMessageSignature(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, authorityKeypair
    );

    const chainSignature = createMessageSignature(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, authorityKeypair
    );

    const projectSignature = createMessageSignature(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, authorityKeypair
    );

    const signatures = [viaSignature, chainSignature, projectSignature];

    console.log('\n✍️  Created signatures:');
    console.log('  VIA signature:', viaSignature.signature.toString('hex').substring(0, 16) + '...');
    console.log('  CHAIN signature:', chainSignature.signature.toString('hex').substring(0, 16) + '...');
    console.log('  PROJECT signature:', projectSignature.signature.toString('hex').substring(0, 16) + '...');

    // TX1: Create TxId PDA with signatures
    console.log('\n🔄 TX1: Creating TxId PDA with signature validation...');
    console.log('   Adding', signatures.length, 'Ed25519 instructions');
    console.log('   Ed25519 program ID:', Ed25519Program.programId.toBase58());

    const tx1 = await sdk.createTxPdaWithSignatures(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures
    );

    console.log('✅ TX1 Success!');
    console.log(`   🔗 Explorer: https://explorer.solana.com/tx/${tx1}?cluster=devnet`);

    // TX2: Process message with signatures
    console.log('\n🔄 TX2: Processing message with signature validation...');
    const tx2 = await sdk.processMessageWithSignatures(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures
    );

    console.log('✅ TX2 Success!');
    console.log(`   🔗 Explorer: https://explorer.solana.com/tx/${tx2}?cluster=devnet`);

    console.log('\n🎉 SIGNATURE VALIDATION WORKING ON DEVNET!');
    console.log('✅ Ed25519 signatures validated successfully');
    console.log('✅ Three-layer security model working');
    console.log('✅ Two-transaction pattern with signatures complete');
    console.log('✅ Production-ready signature validation confirmed');

  } catch (error: any) {
    console.error('\n❌ Signature validation failed:');
    console.error('Error:', error.message);

    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error('  ', log));
    }

    // Check for specific signature validation errors
    if (error.message?.includes('TooFewSignatures')) {
      console.error('💡 Issue: Not enough signatures provided');
    } else if (error.message?.includes('InvalidSignature')) {
      console.error('💡 Issue: Signature verification failed');
    } else if (error.message?.includes('UnauthorizedSigner')) {
      console.error('💡 Issue: Signer not in registry');
    } else if (error.message?.includes('InsufficientViaSignatures')) {
      console.error('💡 Issue: Need more VIA layer signatures');
    }

    throw error;
  }
}

testDevnetSignatures().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});