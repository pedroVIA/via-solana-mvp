/**
 * Via Labs V4 PDA Utilities
 *
 * Program Derived Address generation utilities.
 * Handles: PDA derivation for all program accounts.
 */

import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import type { MessageGatewayV4 } from "../target/types/message_gateway_v4.js";

// Chain IDs from CLAUDE.md specifications
export const SOLANA_CHAIN_ID = new BN("9999999999999999999");  // Destination chain
export const AVALANCHE_CHAIN_ID = new BN("43113");             // Source chain

/**
 * Via Labs V4 PDA Utilities
 *
 * Industry standard PDA derivation utilities for all program accounts.
 */
export class ViaLabsPDAs {
  constructor(private program: Program<MessageGatewayV4>) {}

  /**
   * Get gateway PDA for the Solana chain
   */
  getGatewayPda(): PublicKey {
    const [gatewayPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("gateway"), SOLANA_CHAIN_ID.toArrayLike(Buffer, "le", 8)],
      this.program.programId
    );
    return gatewayPda;
  }

  /**
   * Get signer registry PDA for a specific registry type (uses default Solana chain)
   */
  getSignerRegistryPda(registryType: "via" | "chain" | "project"): PublicKey {
    return this.getSignerRegistryPdaForChain(registryType, SOLANA_CHAIN_ID);
  }

  /**
   * Get signer registry PDA for a specific registry type and chain ID
   */
  getSignerRegistryPdaForChain(registryType: "via" | "chain" | "project", chainId: InstanceType<typeof BN>): PublicKey {
    // Industry standard: Hardcode enum variants when framework auto-resolution fails
    const enumObject = { [registryType]: {} };
    const discriminantBuffer = this.program.coder.types.encode("signerRegistryType", enumObject);

    const [signerRegistryPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("signer_registry"),
        discriminantBuffer,
        chainId.toArrayLike(Buffer, "le", 8)
      ],
      this.program.programId
    );
    return signerRegistryPda;
  }

  /**
   * Get counter PDA for a specific source chain
   */
  getCounterPda(sourceChainId: InstanceType<typeof BN>): PublicKey {
    const [counterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("counter"), sourceChainId.toArrayLike(Buffer, "le", 8)],
      this.program.programId
    );
    return counterPda;
  }

  /**
   * Get TX ID PDA for replay protection
   */
  getTxIdPda(sourceChainId: InstanceType<typeof BN>, txId: InstanceType<typeof BN>): PublicKey {
    const [txIdPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tx"),
        sourceChainId.toArrayLike(Buffer, "le", 8),
        txId.toArrayLike(Buffer, "le", 16)
      ],
      this.program.programId
    );
    return txIdPda;
  }
}

/**
 * Create PDA utilities instance
 *
 * @param program The Message Gateway program instance
 * @returns PDA utilities ready for address derivation
 */
export function createPDAs(program: Program<MessageGatewayV4>): ViaLabsPDAs {
  return new ViaLabsPDAs(program);
}