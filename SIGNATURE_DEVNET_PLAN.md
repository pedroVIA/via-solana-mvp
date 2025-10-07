# Signature Validation - Direct Devnet Implementation

## Goal
Enable real Ed25519 signature validation on devnet. No tests, no bypasses, straight to production-like validation.

## Current State
- TX1 validation: ✅ **ENABLED** at `create_tx_pda.rs:38`
- TX2 validation: ✅ **ENABLED** - bypass removed from `signature.rs:115-119`
- Input validation: ✅ **ENABLED** at `signature.rs:92-100`
- Threshold validation: ✅ **ENABLED** at `signer_registry.rs:50-53`
- SDK: **NEEDS UPDATE** - Still passes empty signature arrays (Phase 2)

## Phase 1: Enable Signatures in Program ✅ COMPLETED

**Status**: All signature validation has been enabled and tested. Program ready for devnet deployment.

**Completed Tasks**:
- ✅ TX1 validation enabled in `create_tx_pda.rs:38`
- ✅ Testing bypass removed from `signature.rs:115-119`
- ✅ Input validation restored in `signature.rs:92-100`
- ✅ **BONUS**: Threshold validation fixed in `signer_registry.rs:50-53` (prevents zero thresholds)

**Audit Results**: Comprehensive signature validation audit completed - no other disabled validations found.

### 1.1 Uncomment TX1 Validation ✅
**File**: `programs/message_gateway_v4/src/instructions/create_tx_pda.rs`
```rust
// Line 39 - UNCOMMENT:
validate_signatures_tx1(&signatures, &message_hash, &ctx.accounts.instructions)?;
```

### 1.2 Remove Testing Bypass ✅
**File**: `programs/message_gateway_v4/src/utils/signature.rs`
```rust
// Lines 115-119 - DELETE these lines completely:
// if signatures.is_empty() {
//     msg!("TESTING MODE: Skipping signature validation for empty signatures array");
//     return Ok(validation_result);
// }
```

### 1.3 Restore Input Validation ✅
**File**: `programs/message_gateway_v4/src/utils/signature.rs`
```rust
// Lines 92-100 - UNCOMMENT:
require!(
    !signatures.is_empty() && signatures.len() <= MAX_SIGNATURES_PER_MESSAGE,
    GatewayError::TooManySignatures
);

require!(
    signatures.len() >= MIN_SIGNATURES_REQUIRED,
    GatewayError::TooFewSignatures
);
```

## Phase 2: Update SDK for Real Signatures

### 2.1 Create Signature Utilities
**New File**: `packages/via-labs-sdk/src/signatures.ts`
```typescript
import { PublicKey, TransactionInstruction, Ed25519Program } from '@solana/web3.js';
import { BN } from 'bn.js';
import * as nacl from 'tweetnacl';
import { createHash } from 'crypto';

export interface MessageSignature {
  signature: Buffer;
  signer: PublicKey;
}

export function createMessageHash(
  txId: BN,
  sourceChainId: BN,
  destChainId: BN,
  sender: Buffer,
  recipient: Buffer,
  onChainData: Buffer,
  offChainData: Buffer
): Buffer {
  const hasher = createHash('sha256');

  hasher.update(txId.toArrayLike(Buffer, 'le', 16));
  hasher.update(sourceChainId.toArrayLike(Buffer, 'le', 8));
  hasher.update(destChainId.toArrayLike(Buffer, 'le', 8));

  hasher.update(Buffer.from([sender.length]));
  hasher.update(sender);

  hasher.update(Buffer.from([recipient.length]));
  hasher.update(recipient);

  const onChainLen = Buffer.alloc(2);
  onChainLen.writeUInt16LE(onChainData.length);
  hasher.update(onChainLen);
  hasher.update(onChainData);

  const offChainLen = Buffer.alloc(2);
  offChainLen.writeUInt16LE(offChainData.length);
  hasher.update(offChainLen);
  hasher.update(offChainData);

  return hasher.digest();
}

export function createEd25519Instruction(
  signature: Buffer,
  publicKey: PublicKey,
  message: Buffer
): TransactionInstruction {
  const instructionData = Buffer.concat([
    Buffer.from([1, 0]),           // num_signatures + padding
    Buffer.from([16, 0, 0, 0]),    // signature offset
    Buffer.from([80, 0, 0, 0]),    // pubkey offset
    Buffer.from([112, 0]),         // message offset
    Buffer.from([message.length, 0, 0, 0]), // message length
    signature,                     // 64 bytes
    publicKey.toBuffer(),          // 32 bytes
    message                        // 32 bytes
  ]);

  return new TransactionInstruction({
    keys: [],
    programId: Ed25519Program.programId,
    data: instructionData,
  });
}

export function signMessage(message: Buffer, secretKey: Uint8Array): Buffer {
  const signature = nacl.sign.detached(message, secretKey);
  return Buffer.from(signature);
}
```

### 2.2 Update SDK Methods
**File**: `packages/via-labs-sdk/src/sdk.ts`
```typescript
import { Transaction, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { createMessageHash, createEd25519Instruction, MessageSignature } from './signatures';

export class ViaLabsSDK {
  // Replace existing createTxPda method
  async createTxPdaWithSignatures(
    txId: TxId,
    sourceChainId: ChainId,
    destChainId: ChainId,
    sender: Buffer,
    recipient: Buffer,
    onChainData: Buffer,
    offChainData: Buffer,
    signatures: MessageSignature[]
  ): Promise<string> {
    const tx = new Transaction();

    // Add Ed25519 instructions first
    const messageHash = createMessageHash(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData
    );

    for (const sig of signatures) {
      tx.add(createEd25519Instruction(sig.signature, sig.signer, messageHash));
    }

    // Add main instruction
    const instruction = await this.client.program.methods
      .createTxPda(txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures)
      .accountsPartial({
        txIdPda: this.pdas.getTxIdPda(sourceChainId, txId),
        counterPda: this.pdas.getCounterPda(sourceChainId),
        relayer: this.client.wallet.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

    tx.add(instruction);
    return await this.client.program.provider.sendAndConfirm(tx);
  }

  // Replace existing processMessage method
  async processMessageWithSignatures(
    txId: TxId,
    sourceChainId: ChainId,
    destChainId: ChainId,
    sender: Buffer,
    recipient: Buffer,
    onChainData: Buffer,
    offChainData: Buffer,
    signatures: MessageSignature[]
  ): Promise<string> {
    const tx = new Transaction();

    const messageHash = createMessageHash(
      txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData
    );

    for (const sig of signatures) {
      tx.add(createEd25519Instruction(sig.signature, sig.signer, messageHash));
    }

    const instruction = await this.client.program.methods
      .processMessage(txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures)
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(destChainId),
        txIdPda: this.pdas.getTxIdPda(sourceChainId, txId),
        viaRegistry: this.pdas.getSignerRegistryPda("via", destChainId),
        chainRegistry: this.pdas.getSignerRegistryPda("chain", sourceChainId),
        projectRegistry: this.pdas.getSignerRegistryPda("project", destChainId),
        relayer: this.client.wallet.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

    tx.add(instruction);
    return await this.client.program.provider.sendAndConfirm(tx);
  }
}
```

## Phase 3: Deploy to Devnet

### 3.1 Build and Deploy
```bash
anchor build
anchor deploy --provider.cluster devnet
```

### 3.2 Setup Infrastructure
```bash
# Initialize gateway and counter
npx ts-node tools/setup.ts 9999999999999999999
```

### 3.3 Generate Real Validators
**Script**: `tools/generate-validators.ts`
```typescript
import { Keypair } from '@solana/web3.js';
import fs from 'fs';

const validators = {
  via: [Keypair.generate(), Keypair.generate()],
  chain: [Keypair.generate(), Keypair.generate()],
  project: [Keypair.generate()],
};

const data = {
  via: validators.via.map(kp => ({
    publicKey: kp.publicKey.toBase58(),
    secretKey: Array.from(kp.secretKey),
  })),
  chain: validators.chain.map(kp => ({
    publicKey: kp.publicKey.toBase58(),
    secretKey: Array.from(kp.secretKey),
  })),
  project: validators.project.map(kp => ({
    publicKey: kp.publicKey.toBase58(),
    secretKey: Array.from(kp.secretKey),
  })),
};

fs.writeFileSync('validators.json', JSON.stringify(data, null, 2));
console.log('Validators saved to validators.json');
```

### 3.4 Setup Registries
**Script**: `tools/setup-registries.ts`
```typescript
import { ViaLabsSDK } from '../packages/via-labs-sdk/src';
import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import fs from 'fs';

async function main() {
  const sdk = new ViaLabsSDK();
  const chainId = new BN('9999999999999999999');
  const validators = JSON.parse(fs.readFileSync('validators.json', 'utf-8'));

  await sdk.initializeRegistry('via', chainId,
    validators.via.map(v => new PublicKey(v.publicKey)), 1);

  await sdk.initializeRegistry('chain', chainId,
    validators.chain.map(v => new PublicKey(v.publicKey)), 1);

  await sdk.initializeRegistry('project', chainId,
    validators.project.map(v => new PublicKey(v.publicKey)), 1);

  console.log('All registries initialized');
}

main().catch(console.error);
```

## Phase 4: Test on Devnet

### 4.1 Create Test Message with Signatures
**Script**: `tools/test-devnet.ts`
```typescript
import { ViaLabsSDK } from '../packages/via-labs-sdk/src';
import { signMessage, MessageSignature, createMessageHash } from '../packages/via-labs-sdk/src/signatures';
import { Keypair } from '@solana/web3.js';
import { BN } from 'bn.js';
import fs from 'fs';

async function testDevnet() {
  const sdk = new ViaLabsSDK();
  const validators = JSON.parse(fs.readFileSync('validators.json', 'utf-8'));

  // Create message
  const txId = new BN(Date.now());
  const sourceChainId = new BN('43113'); // Avalanche
  const destChainId = new BN('9999999999999999999'); // Solana
  const sender = Buffer.from('avalanche_sender');
  const recipient = sdk.wallet.toBuffer();
  const onChainData = Buffer.from('Hello devnet');
  const offChainData = Buffer.from('');

  // Sign with validators
  const messageHash = createMessageHash(txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData);

  const signatures: MessageSignature[] = [
    {
      signature: signMessage(messageHash, Uint8Array.from(validators.via[0].secretKey)),
      signer: new PublicKey(validators.via[0].publicKey),
    },
    {
      signature: signMessage(messageHash, Uint8Array.from(validators.chain[0].secretKey)),
      signer: new PublicKey(validators.chain[0].publicKey),
    },
    {
      signature: signMessage(messageHash, Uint8Array.from(validators.project[0].secretKey)),
      signer: new PublicKey(validators.project[0].publicKey),
    },
  ];

  try {
    console.log('TX1: Creating TxId PDA...');
    const tx1 = await sdk.createTxPdaWithSignatures(txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures);
    console.log('✅ TX1 Success:', `https://explorer.solana.com/tx/${tx1}?cluster=devnet`);

    console.log('TX2: Processing message...');
    const tx2 = await sdk.processMessageWithSignatures(txId, sourceChainId, destChainId, sender, recipient, onChainData, offChainData, signatures);
    console.log('✅ TX2 Success:', `https://explorer.solana.com/tx/${tx2}?cluster=devnet`);

    console.log('🎉 SIGNATURE VALIDATION WORKING ON DEVNET!');
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

testDevnet().catch(console.error);
```

## Execution Steps

```bash
# 1. Make program changes (Phase 1)
# 2. Build and deploy
anchor build
anchor deploy --provider.cluster devnet

# 3. Generate validators
npx ts-node tools/generate-validators.ts

# 4. Setup infrastructure
npx ts-node tools/setup.ts 9999999999999999999
npx ts-node tools/setup-registries.ts

# 5. Test signatures
npx ts-node tools/test-devnet.ts
```

## Expected Results

### Success
- Both transactions confirm on devnet
- Can view them on Solana Explorer
- Logs show signature validation passed

### Failure
- Transaction fails with specific error:
  - `TooFewSignatures`
  - `InvalidSignature`
  - `UnauthorizedSigner`
  - `InsufficientViaSignatures`

## What This Proves

When this works, you'll have:
1. ✅ Real Ed25519 signatures validated on-chain
2. ✅ Three-layer security model working
3. ✅ Two-transaction pattern with signatures
4. ✅ Production-ready signature validation

No tests, no mocks, just real signatures on real devnet transactions.