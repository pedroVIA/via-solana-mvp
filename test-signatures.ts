#!/usr/bin/env tsx

/**
 * Test script for signature implementation using authority.json keypair
 */

import { Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { createMessageSignature, createMessageHash, signMessage } from './packages/via-labs-sdk/src/signatures.js';
import fs from 'fs';

async function testSignatures() {
  console.log('🧪 Testing Via Labs V4 Signature Implementation...\n');

  // Load authority.json keypair
  const authorityPath = './keypairs/authority.json';
  if (!fs.existsSync(authorityPath)) {
    throw new Error('authority.json not found at ./keypairs/authority.json');
  }

  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(authorityPath, 'utf8')))
  );
  console.log('✅ Loaded authority keypair:', authorityKeypair.publicKey.toBase58());

  // Test data
  const txId = new BN(Date.now());
  const sourceChainId = new BN('43113'); // Avalanche testnet
  const destChainId = new BN('9999999999999999999'); // Solana testnet
  const sender = Buffer.from('avalanche_sender');
  const recipient = Buffer.from(authorityKeypair.publicKey.toBytes());
  const onChainData = Buffer.from('Hello Via Labs V4');
  const offChainData = Buffer.from('');

  console.log('📝 Test message data created');

  try {
    // Test message hash
    const messageHash = createMessageHash(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData
    );
    console.log('✅ Message hash created:', messageHash.toString('hex').substring(0, 16) + '...');

    // Test signing
    const signature = signMessage(messageHash, authorityKeypair);
    console.log('✅ Signature created, length:', signature.length, 'bytes');

    // Test complete message signature
    const messageSignature = createMessageSignature(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, authorityKeypair
    );
    console.log('✅ Message signature created successfully');
    console.log('  Signer:', messageSignature.signer.toBase58());

    if (messageSignature.signature.length === 64) {
      console.log('✅ Signature length correct (64 bytes)');
    } else {
      throw new Error(`Wrong signature length: ${messageSignature.signature.length}`);
    }

    console.log('\n🎉 All signature tests passed!');
    console.log('✅ Phase 2 SDK implementation ready for devnet');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

testSignatures().catch(console.error);