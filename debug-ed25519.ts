#!/usr/bin/env tsx

import { Ed25519Program } from '@solana/web3.js';

console.log('Ed25519Program.programId:', Ed25519Program.programId.toBase58());
console.log('Expected:', 'Ed25519SigVerify111111111111111111111111111');