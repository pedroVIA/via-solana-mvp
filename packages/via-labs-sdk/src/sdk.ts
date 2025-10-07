/**
 * Via Labs V4 SDK
 *
 * Atomic operations for the Via Labs cross-chain messaging protocol.
 * Provides building blocks for composing complex workflows.
 * No opinionated patterns - maximum flexibility.
 */

import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Transaction, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { ViaLabsClient } from "./connection.js";
import { ViaLabsPDAs } from "./pdas.js";
import type { ChainId, TxId, RegistryType } from "./types.js";
import { createMessageHash, createEd25519Instruction, formatSignaturesForAnchor } from "./signatures.js";
import type { MessageSignature } from "./signatures.js";

/**
 * Main SDK class - atomic operations for Via Labs protocol
 */
export class ViaLabsSDK {
  private client: ViaLabsClient;
  private pdas: ViaLabsPDAs;

  constructor(client?: ViaLabsClient) {
    this.client = client || new ViaLabsClient();
    this.pdas = new ViaLabsPDAs(this.client.program);
  }

  // ============= Gateway Operations =============

  async initializeGateway(chainId: ChainId): Promise<string> {
    const tx = await this.client.program.methods
      .initializeGateway(chainId)
      .rpc();
    return tx;
  }

  async setSystemEnabled(chainId: ChainId, enabled: boolean): Promise<string> {
    const tx = await this.client.program.methods
      .setSystemEnabled(enabled)
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(chainId),
        authority: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  // ============= Message Operations =============

  async sendMessage(params: {
    txId: TxId;
    recipient: Buffer;
    destChainId: ChainId;
    chainData: Buffer;
    confirmations: number;
  }): Promise<string> {
    const tx = await this.client.program.methods
      .sendMessage(
        params.txId,
        params.recipient,
        params.destChainId,
        params.chainData,
        params.confirmations
      )
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(params.destChainId),
        sender: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async createTxPda(
    txId: TxId,
    sourceChainId: ChainId,
    destChainId: ChainId,
    sender: Buffer,
    recipient: Buffer,
    onChainData: Buffer,
    offChainData: Buffer,
    signatures: any[] = []
  ): Promise<string> {
    const tx = await this.client.program.methods
      .createTxPda(
        txId,
        sourceChainId,
        destChainId,
        sender,
        recipient,
        onChainData,
        offChainData,
        signatures
      )
      .accountsPartial({
        txIdPda: this.pdas.getTxIdPda(sourceChainId, txId),
        counterPda: this.pdas.getCounterPda(sourceChainId),
        relayer: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async processMessage(
    txId: TxId,
    sourceChainId: ChainId,
    destChainId: ChainId,
    sender: Buffer,
    recipient: Buffer,
    onChainData: Buffer,
    offChainData: Buffer,
    signatures: any[] = []
  ): Promise<string> {
    const tx = await this.client.program.methods
      .processMessage(
        txId,
        sourceChainId,
        destChainId,
        sender,
        recipient,
        onChainData,
        offChainData,
        signatures
      )
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(destChainId),
        txIdPda: this.pdas.getTxIdPda(sourceChainId, txId),
        viaRegistry: this.pdas.getSignerRegistryPda("via", destChainId),
        chainRegistry: this.pdas.getSignerRegistryPda("chain", sourceChainId),
        projectRegistry: this.pdas.getSignerRegistryPda("project", destChainId),
        relayer: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  // ============= Signature-Enabled Methods =============

  /**
   * Create TxId PDA with real Ed25519 signature validation
   * Replaces createTxPda for production use with real signatures
   */
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
      .createTxPda(
        txId,
        sourceChainId,
        destChainId,
        sender,
        recipient,
        onChainData,
        offChainData,
        formatSignaturesForAnchor(signatures)
      )
      .accountsPartial({
        txIdPda: this.pdas.getTxIdPda(sourceChainId, txId),
        counterPda: this.pdas.getCounterPda(sourceChainId),
        relayer: this.client.wallet.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

    tx.add(instruction);
    return await (this.client.program.provider as AnchorProvider).sendAndConfirm(tx);
  }

  /**
   * Process message with real Ed25519 signature validation
   * Replaces processMessage for production use with real signatures
   */
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
      .processMessage(
        txId,
        sourceChainId,
        destChainId,
        sender,
        recipient,
        onChainData,
        offChainData,
        formatSignaturesForAnchor(signatures)
      )
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
    return await (this.client.program.provider as AnchorProvider).sendAndConfirm(tx);
  }

  // ============= Registry Operations =============

  private getRegistryEnum(type: RegistryType):
    | { via: Record<string, never> }
    | { chain: Record<string, never> }
    | { project: Record<string, never> } {
    // Type-safe enum creation for Anchor
    // Using Record<string, never> is the proper TypeScript way to represent empty objects
    switch(type) {
      case 'via':
        return { via: {} as Record<string, never> };
      case 'chain':
        return { chain: {} as Record<string, never> };
      case 'project':
        return { project: {} as Record<string, never> };
      default:
        // This should never happen due to TypeScript type checking
        throw new Error(`Invalid registry type: ${type}`);
    }
  }

  async initializeRegistry(
    type: RegistryType,
    chainId: ChainId,
    signers: PublicKey[] = [this.client.wallet.publicKey],
    threshold: number = 0
  ): Promise<string> {
    const tx = await this.client.program.methods
      .initializeSignerRegistry(this.getRegistryEnum(type), chainId, signers, threshold)
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(chainId),
        signerRegistry: this.pdas.getSignerRegistryPda(type, chainId),
        authority: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async addSigner(type: RegistryType, chainId: ChainId, signer: PublicKey): Promise<string> {
    const tx = await this.client.program.methods
      .addSigner(this.getRegistryEnum(type), chainId, signer)
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(chainId),
        signerRegistry: this.pdas.getSignerRegistryPda(type, chainId),
        authority: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async removeSigner(type: RegistryType, chainId: ChainId, signer: PublicKey): Promise<string> {
    const tx = await this.client.program.methods
      .removeSigner(this.getRegistryEnum(type), chainId, signer)
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(chainId),
        signerRegistry: this.pdas.getSignerRegistryPda(type, chainId),
        authority: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async updateSigners(type: RegistryType, chainId: ChainId, signers: PublicKey[], threshold: number): Promise<string> {
    const tx = await this.client.program.methods
      .updateSigners(this.getRegistryEnum(type), chainId, signers, threshold)
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(chainId),
        signerRegistry: this.pdas.getSignerRegistryPda(type, chainId),
        authority: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async updateThreshold(type: RegistryType, chainId: ChainId, threshold: number): Promise<string> {
    const tx = await this.client.program.methods
      .updateThreshold(this.getRegistryEnum(type), chainId, threshold)
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(chainId),
        signerRegistry: this.pdas.getSignerRegistryPda(type, chainId),
        authority: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async setRegistryEnabled(type: RegistryType, chainId: ChainId, enabled: boolean): Promise<string> {
    const tx = await this.client.program.methods
      .setRegistryEnabled(this.getRegistryEnum(type), chainId, enabled)
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(chainId),
        signerRegistry: this.pdas.getSignerRegistryPda(type, chainId),
        authority: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  // ============= Counter Operations =============

  async initializeCounter(sourceChainId: ChainId): Promise<string> {
    const tx = await this.client.program.methods
      .initializeCounter(sourceChainId)
      .accountsPartial({
        gateway: this.pdas.getGatewayPda(sourceChainId),
        authority: this.client.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  // ============= Getters =============

  get program() {
    return this.client.program;
  }

  get provider(): AnchorProvider {
    return this.client.program.provider as AnchorProvider;
  }

  get wallet(): PublicKey {
    return this.client.wallet.publicKey;
  }

  get pda(): ViaLabsPDAs {
    return this.pdas;
  }
}

// Export factory functions for common configurations
export const createSDK = (client?: ViaLabsClient) => new ViaLabsSDK(client);
export const createLocalnetSDK = () => new ViaLabsSDK(new ViaLabsClient());
export const createDevnetSDK = () => new ViaLabsSDK(new ViaLabsClient());
export const createMainnetSDK = () => new ViaLabsSDK(new ViaLabsClient());