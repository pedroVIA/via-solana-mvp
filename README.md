# Via Labs V4 - Solana Message Gateway

A production-ready cross-chain messaging protocol for Solana, enabling secure message passing between Solana and Avalanche with enterprise-grade replay protection and multi-layer security validation. Includes a TypeScript SDK for seamless integration.

## Features

- **🔒 Atomic Replay Protection**: Two-transaction pattern with PDA-based replay prevention
- **🛡️ Three-Layer Security**: Via Labs validators + Chain validators + Project-specific signers
- **⚡ High Performance**: Optimized to ~107K compute units (well under Solana's 200K limit)
- **🌍 Cross-Chain Ready**: Support for Solana and Avalanche with standardized message format
- **🚀 Production Deployment**: Automated deployment system with health monitoring
- **✅ Production Ready**: Clean codebase with automated deployment pipeline
- **📦 TypeScript SDK**: Professional SDK for all protocol interactions

## Quick Start

### Prerequisites

- Rust 1.75+ with Cargo
- Solana CLI 2.2+
- Anchor 0.31.1
- Node.js 18+ and npm 8+
- A funded Solana wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/via-labs/via_solana_mvp.git
cd via_solana_mvp/message_gateway_v4

# Install dependencies
npm install

# Build the program
npm run build
```

### Local Development

```bash
# Build and deploy
npm run build
npm run deploy
npm run setup
```

### Deployment

```bash
# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Deploy to devnet
npm run deploy

# Initialize gateway and registries
npm run setup
```

## Architecture

### Two-Transaction Replay Protection

The protocol uses a novel two-transaction pattern to prevent replay attacks:

1. **Transaction 1**: `create_tx_pda`
   - Creates a unique PDA with seeds `["tx", source_chain_id, tx_id]`
   - Fails if PDA already exists (prevents replays)
   - Stores message hash for validation

2. **Transaction 2**: `process_message`
   - Validates three-layer signatures
   - Processes the message
   - Atomically closes the PDA and reclaims rent

### Three-Layer Security Model

```
┌─────────────┐
│  Via Layer  │ ← Via Labs core validators (required)
├─────────────┤
│ Chain Layer │ ← Chain-specific validators (required)
├─────────────┤
│Project Layer│ ← Application validators (optional)
└─────────────┘
```

Each layer has independent threshold validation with configurable signer registries.

### Project Structure

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

## Usage Examples

**All interactions use the TypeScript SDK** - raw Anchor functions are not recommended.

### Basic SDK Setup

```typescript
import { ViaLabsSDK } from '@via-labs/sdk';
import { SOLANA_CHAIN_ID, AVALANCHE_CHAIN_ID } from '@via-labs/sdk/constants';
import { BN } from '@coral-xyz/anchor';

const sdk = new ViaLabsSDK();
```

### Initialize Gateway and Registries

```typescript
// Initialize gateway for a chain
const initTx = await sdk.initializeGateway(SOLANA_CHAIN_ID);
console.log('Gateway initialized:', initTx);

// Initialize signer registries (Via, Chain, Project layers)
const viaTx = await sdk.initializeRegistry('via', SOLANA_CHAIN_ID);
const chainTx = await sdk.initializeRegistry('chain', SOLANA_CHAIN_ID);
const projectTx = await sdk.initializeRegistry('project', SOLANA_CHAIN_ID);
```

### Sending a Cross-Chain Message

```typescript
const sendTx = await sdk.sendMessage({
  txId: new BN(12345),
  recipient: Buffer.from('recipient_address_here'),
  destChainId: AVALANCHE_CHAIN_ID,
  chainData: Buffer.from('message_data'),
  confirmations: 10
});
console.log('Message sent:', sendTx);
```

### Processing Incoming Message (Two-Transaction Pattern)

```typescript
// Step 1: Create replay protection PDA
const createTx = await sdk.createTxPda(
  new BN(12345),           // txId
  AVALANCHE_CHAIN_ID,      // sourceChainId
  SOLANA_CHAIN_ID,         // destChainId
  Buffer.from('sender'),   // sender
  Buffer.from('recipient'), // recipient
  Buffer.from('onChain'),  // onChainData
  Buffer.from('offChain'), // offChainData
  []                       // signatures
);

// Step 2: Process message with signatures
const processTx = await sdk.processMessage(
  new BN(12345),           // txId
  AVALANCHE_CHAIN_ID,      // sourceChainId
  SOLANA_CHAIN_ID,         // destChainId
  Buffer.from('sender'),   // sender
  Buffer.from('recipient'), // recipient
  Buffer.from('onChain'),  // onChainData
  Buffer.from('offChain'), // offChainData
  []                       // signatures (simplified for example)
);
```

### Signer Management

```typescript
import { PublicKey } from '@solana/web3.js';

// Add a signer to the Via layer
const newSigner = new PublicKey('...');
const addTx = await sdk.addSigner('via', SOLANA_CHAIN_ID, newSigner);

// Update threshold for Chain layer
const updateTx = await sdk.updateThreshold('chain', SOLANA_CHAIN_ID, 2);

// Remove a signer from Project layer
const removeTx = await sdk.removeSigner('project', SOLANA_CHAIN_ID, oldSigner);
```

## Development

```bash
# Build the program
npm run build

# Deploy to network
npm run deploy

# Post-deployment setup
npm run setup
```

## Configuration

### Environment Variables

Create a `.env` file from the template:

```bash
# Network configuration
NETWORK=devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=./keypairs/authority.json

# Program keypair (optional, auto-generated if not provided)
PROGRAM_KEYPAIR=./keypairs/program.json
```

### Chain IDs

- Solana: `9999999999999999999`
- Avalanche: `43113`

### Message Limits

- MAX_SENDER_SIZE: 64 bytes
- MAX_RECIPIENT_SIZE: 64 bytes
- MAX_ON_CHAIN_DATA: 1024 bytes
- MAX_OFF_CHAIN_DATA: 4096 bytes

## Security Considerations

- **Never modify PDA seeds** in deployed programs
- **Signature validation** uses ~10K compute units per signature
- **Total compute usage** is ~107K CU (safe margin under 200K limit)
- **All admin functions** require proper authority validation
- **System circuit breaker** available via `set_system_enabled`

## Monitoring

```bash
# View program logs
solana logs <program_id> -u devnet
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Signature verification failed | Check Ed25519 instruction offsets and format |
| PDA already exists | Transaction already processed, check for replay |
| Compute budget exceeded | Reduce signature count or optimize validation |
| Account not found | Verify PDA seed derivation matches exactly |
| Deploy fails | Check keypairs exist in `./keypairs/` directory |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Build your changes (`anchor build`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- Documentation: [docs.vialabs.io](https://docs.vialabs.io)
- Issues: [GitHub Issues](https://github.com/via-labs/via_solana_mvp/issues)
- Discord: [Via Labs Community](https://discord.gg/vialabs)

## Acknowledgments

Built with [Anchor](https://www.anchor-lang.com/) - The Solana Sealevel Framework

---

**⚠️ Production Notice**: This is production-ready code handling real value. Always deploy and verify thoroughly in devnet before mainnet deployment.