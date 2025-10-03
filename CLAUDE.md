# CLAUDE.md

This file provides guidance to Claude Code when working with the Via Labs V4 Solana MVP.

## Project Overview

Via Labs V4 cross-chain messaging protocol for Solana. Uses two-transaction atomic replay protection
pattern with three-layer signature validation (Via/Chain/Project). Production-ready implementation with
TypeScript SDK for seamless integration.

## 🚨 Critical Safety Rules

1. **NEVER modify PDA seeds** - `["tx", source_chain_id, tx_id]` - breaks deployed contracts
2. **NEVER change signature validation logic** without comprehensive testing
3. **NEVER alter the two-transaction pattern** - core security mechanism
4. **NEVER modify account sizes** - MessageGateway(42), TxIdPda(17) are fixed
5. **ALWAYS build and verify after core changes** - `npm run build`

## Essential Commands

```bash
# Development
npm run build                   # Build program (uses anchor build)
npm run deploy                  # Deploy to configured cluster
npm run setup                   # Post-deployment initialization

```

## Architecture (Don't Break These)

### Two-Transaction Pattern (CRITICAL)
1. **TX1**: `create_tx_pda()` - Creates TxId PDA, fails if exists (replay protection)
2. **TX2**: `process_message()` - Validates signatures, closes PDA atomically

### PDA Seeds (IMMUTABLE)
- Gateway: `["gateway", chain_id]`
- TxId: `["tx", source_chain_id, tx_id]`
- Counter: `["counter", source_chain_id]`
- SignerRegistry: `["signer_registry", registry_type, chain_id]`

### Three-Layer Security
1. **Via Layer**: Via Labs core signers (required)
2. **Chain Layer**: Chain-specific validators (required)
3. **Project Layer**: Application signers (optional)

Each layer validated independently. Signers can belong to multiple layers.

## SDK Usage (Primary Interface)

**All interactions should use the TypeScript SDK** located in `packages/via-labs-sdk/`. The SDK provides atomic operations for gateway initialization, message sending, signer management, and cross-chain processing.

```typescript
import { ViaLabsSDK } from '@via-labs/sdk';

const sdk = new ViaLabsSDK();

// Example: Initialize gateway
const tx = await sdk.initializeGateway(chainId);

// Example: Send cross-chain message
const tx = await sdk.sendMessage({
  txId, recipient, destChainId, chainData, confirmations
});
```

The SDK handles all PDA derivation, signature validation, and transaction construction. **Do not use raw Anchor functions** - use the SDK methods instead.

## Key Files

```
├── packages/via-labs-sdk/    # TypeScript SDK (PRIMARY INTERFACE)
│   ├── src/
│   │   ├── sdk.ts           # Main SDK class
│   │   ├── connection.ts    # Anchor program connection
│   │   ├── pdas.ts          # PDA derivation utilities
│   │   ├── types.ts         # Type definitions
│   │   └── constants.ts     # Chain IDs and constants
├── programs/message_gateway_v4/src/
│   ├── lib.rs               # Main entry point (18 instructions)
│   ├── instructions/
│   │   ├── initialize.rs    # Gateway initialization
│   │   ├── create_tx_pda.rs # Replay protection (TX1)
│   │   ├── process_message.rs # Message processing (TX2)
│   │   └── signer_registry.rs # Signer management
│   ├── state/
│   │   ├── gateway.rs       # Gateway account (42 bytes)
│   │   ├── tx_id.rs         # TxId PDA (17 bytes)
│   │   └── signer_registry.rs # Registry state
│   └── utils/
│       ├── hash.rs          # Keccak256 hashing
│       └── signature.rs     # Ed25519 validation
└── tools/                   # Internal development tools
    └── setup.ts             # Deployment setup workflow
```

## What NOT to Do

- **DON'T** create new PDAs without security review
- **DON'T** modify constants in `constants.rs` for deployed programs
- **DON'T** change instruction discriminators
- **DON'T** alter event structures (breaks indexers)
- **DON'T** remove rent reclamation in `process_message`
- **DON'T** bypass signature threshold checks
- **DON'T** modify cross-chain message encoding

## Common Issues → Solutions

- **Signature verification failed** → Check Ed25519 instruction offsets
- **PDA already exists** → TX1 already executed, check for replay
- **Compute budget exceeded** → Signature validation >36K CU, reduce signatures
- **Account not found** → Verify PDA seed derivation matches exactly
- **Deploy fails** → Check keypairs exist in ./keypairs/ directory

## Chain IDs & Limits

- Solana: 9999999999999999999, Avalanche: 43113
- MAX_SENDER_SIZE: 64 bytes
- MAX_ON_CHAIN_DATA: 1024 bytes
- Compute: ~107K CU total (under 200K limit)

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure: `NETWORK`, `ANCHOR_PROVIDER_URL`, `ANCHOR_WALLET`
3. Deploy: `npm run deploy`

Program IDs managed in `Anchor.toml` per network.