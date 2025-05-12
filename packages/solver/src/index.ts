import { arbitrumSepolia, liskSepolia } from 'viem/chains';
import { openIntentListener } from './listener';
import { createPublicClient, http, PublicClient } from 'viem';
import { openIntentSolver } from './solver';

async function main() {
  openIntentListener({
    publicClient: createPublicClient({
      chain: arbitrumSepolia,
      transport: http(),
    }) as PublicClient,
    contractAddress: '0x1EeaF4f3b82b4f6BbF968B2dAE9Fb60edD1b6Ede',
    solver: openIntentSolver,
  });
  openIntentListener({
    publicClient: createPublicClient({
      chain: liskSepolia,
      transport: http(),
    }) as PublicClient,
    contractAddress: '0x8Bbe61f95364FEa284C6c01866dfe9D513f1E456',
    solver: openIntentSolver,
  });
}

main();
