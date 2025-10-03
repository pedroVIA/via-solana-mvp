/**
 * Via Labs V4 PDA Utilities
 *
 * Brutally competent, chain-agnostic PDA derivation with validation and error handling.
 */

import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import type { MessageGatewayV4 } from "../../../target/types/message_gateway_v4.js";
import type { ChainId, TxId, RegistryType } from "./types.js";
import { validateChainId, validateTxId } from "./types.js";
import { CHAIN_ID_BYTES, TX_ID_BYTES } from "./constants.js";

/**
 * Convert registry type to discriminant value (matches Rust enum discriminants)
 */
function registryTypeToDiscriminant(registryType: RegistryType): number {
  switch (registryType) {
    case "via": return 0;
    case "chain": return 1;
    case "project": return 2;
    default:
      throw new Error(`Invalid registry type: ${registryType}`);
  }
}

/**
 * Brutally competent PDA utilities with validation and error handling
 */
export class ViaLabsPDAs {
  constructor(private program: Program<MessageGatewayV4>) {}

  /**
   * Get gateway PDA for a specific chain
   * @param chainId The chain ID for the gateway
   */
  getGatewayPda(chainId: ChainId): PublicKey {
    validateChainId(chainId);

    const [gatewayPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("gateway"), chainId.toArrayLike(Buffer, "le", CHAIN_ID_BYTES)],
      this.program.programId
    );
    return gatewayPda;
  }

  /**
   * Get signer registry PDA for a specific registry type and chain
   * @param registryType The type of registry (via, chain, or project)
   * @param chainId The chain ID for the registry
   */
  getSignerRegistryPda(registryType: RegistryType, chainId: ChainId): PublicKey {
    validateChainId(chainId);

    // Use simple discriminant bytes to match Rust: registry_type.discriminant().to_le_bytes()
    const discriminantBuffer = Buffer.from([registryTypeToDiscriminant(registryType)]);

    const [signerRegistryPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("signer_registry"),
        discriminantBuffer,
        chainId.toArrayLike(Buffer, "le", CHAIN_ID_BYTES)
      ],
      this.program.programId
    );
    return signerRegistryPda;
  }

  /**
   * Get counter PDA for a specific source chain
   * @param sourceChainId The source chain ID for the counter
   */
  getCounterPda(sourceChainId: ChainId): PublicKey {
    validateChainId(sourceChainId);

    const [counterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("counter"), sourceChainId.toArrayLike(Buffer, "le", CHAIN_ID_BYTES)],
      this.program.programId
    );
    return counterPda;
  }

  /**
   * Get TX ID PDA for replay protection
   * @param sourceChainId The source chain ID for the transaction
   * @param txId The transaction ID
   */
  getTxIdPda(sourceChainId: ChainId, txId: TxId): PublicKey {
    validateChainId(sourceChainId);
    validateTxId(txId);

    const [txIdPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tx"),
        sourceChainId.toArrayLike(Buffer, "le", CHAIN_ID_BYTES),
        txId.toArrayLike(Buffer, "le", TX_ID_BYTES)
      ],
      this.program.programId
    );
    return txIdPda;
  }
}

