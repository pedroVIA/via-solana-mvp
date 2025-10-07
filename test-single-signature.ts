#!/usr/bin/env tsx

/**
 * Test single signature validation - simpler debugging
 */

import { ViaLabsSDK, createMessageSignature, createMessageHash, signMessage } from './packages/via-labs-sdk/src/index.js';
import { Keypair, Ed25519Program } from '@solana/web3.js';
import BN from 'bn.js';
import fs from 'fs';

async function testSingleSignature() {
  console.log('🧪 Testing single signature validation...\n');

  const sdk = new ViaLabsSDK();

  // Load authority keypair
  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('./keypairs/authority.json', 'utf8')))
  );

  console.log('🔑 Authority signer:', authorityKeypair.publicKey.toBase58());
  console.log('📍 Program ID:', sdk.program.programId.toBase58());
  console.log('📍 Ed25519 program ID:', Ed25519Program.programId.toBase58());

  // Create test message
  const txId = new BN(Date.now());
  const sourceChainId = new BN('43113');
  const destChainId = new BN('43113');
  const sender = Buffer.from('test_sender');
  const recipient = Buffer.from(authorityKeypair.publicKey.toBytes());
  const onChainData = Buffer.from('single sig test');
  const offChainData = Buffer.from('');

  try {
    // Create message hash ONCE and reuse it
    const messageHash = createMessageHash(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData
    );

    console.log('📝 Message hash:', messageHash.toString('hex').substring(0, 16) + '...');

    // Create signature using the same message hash
    const signature = signMessage(messageHash, authorityKeypair);
    const viaSignature = {
      signature,
      signer: authorityKeypair.publicKey,
    };

    const signatures = [viaSignature];

    console.log('\n✍️  Created 1 signature for VIA registry');
    console.log('  Signature length:', viaSignature.signature.length, 'bytes');
    console.log('  Signer:', viaSignature.signer.toBase58());

    // TX1: Create TxId PDA with single signature
    console.log('\n🔄 TX1: Creating TxId PDA with single signature...');
    const tx1 = await sdk.createTxPdaWithSignatures(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures
    );

    console.log('✅ TX1 Success with single signature!');
    console.log(`   🔗 Explorer: https://explorer.solana.com/tx/${tx1}?cluster=devnet`);

  } catch (error: any) {
    console.error('\n❌ Single signature test failed:');
    console.error('Error:', error.message);

    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error('  ', log));
    }

    throw error;
  }
}

testSingleSignature().catch((error) => {
  console.error('\nSingle signature test failed:', error);
  process.exit(1);
});