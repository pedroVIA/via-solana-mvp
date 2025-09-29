# Via Labs V4 - Solana Message Gateway

A production-ready cross-chain messaging protocol for Solana, enabling secure message passing between Solana and Avalanche with enterprise-grade replay protection and multi-layer security validation.

## Features

- **🔒 Atomic Replay Protection**: Two-transaction pattern with PDA-based replay prevention
- **🛡️ Three-Layer Security**: VIA Labs validators + Chain validators + Project-specific signers
- **⚡ High Performance**: Optimized to ~107K compute units (well under Solana's 200K limit)
- **🌍 Cross-Chain Ready**: Support for Solana and Avalanche with standardized message format
- **🚀 Production Deployment**: Automated deployment system with health monitoring
- **✅ Production Ready**: Clean codebase with automated deployment pipeline

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
anchor build
```

### Local Development

```bash
# Start local validator
anchor localnet

# Build the program
anchor build

# Deploy to any network (configure desired network in Anchor.toml [provider] cluster)
npm run deploy
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
│  VIA Layer  │ ← Via Labs core validators (required)
├─────────────┤
│ Chain Layer │ ← Chain-specific validators (required)
├─────────────┤
│Project Layer│ ← Application validators (optional)
└─────────────┘
```

Each layer has independent threshold validation with configurable signer registries.

### Program Structure

```
programs/message_gateway_v4/src/
├── lib.rs                    # Main entry point (18 instructions)
├── instructions/
│   ├── initialize.rs         # Gateway initialization
│   ├── create_tx_pda.rs      # Replay protection (TX1)
│   ├── process_message.rs    # Message processing (TX2)
│   └── signer_registry.rs    # Signer management
├── state/
│   ├── gateway.rs            # Gateway account (42 bytes)
│   ├── tx_id.rs              # TxId PDA (17 bytes)
│   └── signer_registry.rs    # Registry state
└── utils/
    ├── hash.rs               # Keccak256 hashing
    └── signature.rs          # Ed25519 validation
```

## Usage Examples

### Sending a Cross-Chain Message

```typescript
import { Program } from '@coral-xyz/anchor';
import { MessageGatewayV4 } from './target/types/message_gateway_v4';

// Send message from Avalanche to Solana
const tx = await program.methods
  .sendMessage(
    sourceChainId,
    destinationChainId,
    sender,
    recipient,
    messageData
  )
  .accounts({
    gateway: gatewayPDA,
    counter: counterPDA,
    authority: wallet.publicKey,
  })
  .rpc();
```

### Processing Incoming Message

```typescript
// Step 1: Create replay protection PDA
await program.methods
  .createTxPda(sourceChainId, txId, messageHash)
  .accounts({
    txIdPda: txIdPDA,
    payer: wallet.publicKey,
  })
  .rpc();

// Step 2: Process message with signatures
await program.methods
  .processMessage(message, signatures)
  .accounts({
    gateway: gatewayPDA,
    txIdPda: txIdPDA,
    // ... signer registries
  })
  .rpc();
```

## Development

```bash
# Build the program
anchor build

# Deploy to network
npm run deploy
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