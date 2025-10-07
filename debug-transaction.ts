#!/usr/bin/env tsx

/**
 * Debug transaction structure to see what instructions are being added
 */

import { ViaLabsSDK, createMessageSignature, createEd25519Instruction, createMessageHash } from './packages/via-labs-sdk/src/index.js';
import { Keypair, Ed25519Program, Transaction, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import BN from 'bn.js';
import fs from 'fs';

async function debugTransaction() {
  console.log('🔍 Debugging transaction structure...\n');

  const sdk = new ViaLabsSDK();

  // Load authority keypair
  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('./keypairs/authority.json', 'utf8')))
  );

  console.log('🔑 Authority signer:', authorityKeypair.publicKey.toBase58());

  // Create test message
  const txId = new BN(Date.now());
  const sourceChainId = new BN('43113');
  const destChainId = new BN('43113');
  const sender = Buffer.from('test_sender');
  const recipient = Buffer.from(authorityKeypair.publicKey.toBytes());
  const onChainData = Buffer.from('debug test');
  const offChainData = Buffer.from('');

  // Create signature
  const viaSignature = createMessageSignature(
    txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, authorityKeypair
  );

  const signatures = [viaSignature];

  console.log('✍️  Created signature');

  try {
    // Manually construct transaction to debug
    const tx = new Transaction();

    // Add Ed25519 instructions
    const messageHash = createMessageHash(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData
    );

    console.log('📝 Message hash:', messageHash.toString('hex').substring(0, 16) + '...');

    for (const sig of signatures) {
      const ed25519Ix = createEd25519Instruction(sig.signature, sig.signer, messageHash);
      console.log('📄 Adding Ed25519 instruction:');
      console.log('   Program ID:', ed25519Ix.programId.toBase58());
      console.log('   Data length:', ed25519Ix.data.length);
      console.log('   Keys length:', ed25519Ix.keys.length);
      tx.add(ed25519Ix);
    }

    // Add main instruction
    const instruction = await sdk.program.methods
      .createTxPda(
        txId,
        sourceChainId,
        destChainId,
        sender,
        recipient,
        onChainData,
        offChainData,
        signatures.map(sig => ({
          signature: Array.from(sig.signature),
          signer: sig.signer,
        }))
      )
      .accountsPartial({
        txIdPda: sdk.pda.getTxIdPda(sourceChainId, txId),
        counterPda: sdk.pda.getCounterPda(sourceChainId),
        relayer: sdk.wallet,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

    console.log('📄 Adding main program instruction:');
    console.log('   Program ID:', instruction.programId.toBase58());
    console.log('   Data length:', instruction.data.length);

    tx.add(instruction);

    console.log('\n📋 Transaction structure:');
    console.log('   Total instructions:', tx.instructions.length);

    tx.instructions.forEach((ix, index) => {
      console.log(`   [${index}] ${ix.programId.toBase58()} (${ix.data.length} bytes)`);
      if (ix.programId.toBase58() === 'Ed25519SigVerify111111111111111111111111111') {
        console.log(`       ↳ Ed25519 instruction detected!`);
      }
    });

    // Try to simulate the transaction to see what happens
    console.log('\n🚀 Attempting simulation...');

    // Set recent blockhash
    const { blockhash } = await sdk.program.provider.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = sdk.wallet;

    // Try to simulate
    const simulation = await sdk.program.provider.connection.simulateTransaction(tx);

    console.log('📊 Simulation result:');
    console.log('   Error:', simulation.value.err);
    console.log('   Logs:', simulation.value.logs?.slice(0, 10));

  } catch (error: any) {
    console.error('\n❌ Debug failed:', error.message);
    if (error.logs) {
      console.error('Program logs:');
      error.logs.forEach((log: string) => console.error('  ', log));
    }
  }
}

debugTransaction().catch(console.error);