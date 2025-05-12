import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { openIntentListener } from './listener';
import { createPublicClient, http, PublicClient } from 'viem';
import { openIntentSolver } from './solver';

async function main() {
  openIntentListener({
    publicClient: createPublicClient({
      chain: arbitrumSepolia,
      transport: http(),
    }) as PublicClient,
    contractAddress: '0x576ba9ea0dc68f8b18ff8443a1d0aa1425459ef5',
    solver: openIntentSolver,
  });
  openIntentListener({
    publicClient: createPublicClient({
      chain: baseSepolia,
      transport: http(),
    }) as PublicClient,
    contractAddress: '0xabb2e3cc9ef0c41f3c076afd2701684f8418e7d8',
    solver: openIntentSolver,
  });
}

main();
