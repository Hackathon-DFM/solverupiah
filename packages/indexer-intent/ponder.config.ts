import { createConfig } from 'ponder';
import { http } from 'viem';

import { Hyperlane7683Abi } from './abis/Hyperlane7683';
import { arbitrumSepolia, liskSepolia } from 'viem/chains';

export default createConfig({
  networks: {
    liskSepolia: {
      chainId: 4202,
      transport: http('https://rpc.sepolia-api.lisk.com'),
    },
    arbitrumSepolia: {
      chainId: 421614,
      transport: http('https://arbitrum-sepolia-rpc.publicnode.com'),
    },
  },
  contracts: {
    RouterLisk: {
      network: 'liskSepolia',
      abi: Hyperlane7683Abi,
      address: '0x8Bbe61f95364FEa284C6c01866dfe9D513f1E456',
      startBlock: 20864055,
    },
    RouterArbi: {
      network: 'arbitrumSepolia',
      abi: Hyperlane7683Abi,
      address: '0x1EeaF4f3b82b4f6BbF968B2dAE9Fb60edD1b6Ede',
      startBlock: 151203512,
    },
  },
});
