import { ask } from '../utils';
import {
  Address,
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { liskSepolia, arbitrumSepolia } from 'viem/chains';
import { DESTINATION_ROUTER_ADDRESS, SOLVER_PK } from '../config';
import routerAbi from '../abis/Hyperlane7683.json';

const walletAccount = privateKeyToAccount(SOLVER_PK as Address);
const walletClient = createWalletClient({
  account: walletAccount,
  chain: arbitrumSepolia,
  transport: http(),
});

const publicClientOrigin = createPublicClient({
  chain: liskSepolia,
  transport: http(),
});

const publicClientDestination = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
});

export const settleIntent = async () => {
  const orderId = await ask('input the orderId that want to be settled');
  if (!orderId) return;

  const quoteGasPayment = await publicClientDestination.readContract({
    address: DESTINATION_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'quoteGasPayment',
    args: [421614],
  });

  console.log('quoteGasPayment: ', formatUnits(quoteGasPayment as bigint, 18));

  const confirm = await ask('continue (Y/n)?');

  if (confirm === 'n') return;

  const txHash = await walletClient.writeContract({
    address: DESTINATION_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'settle',
    args: [[orderId]],
    value: quoteGasPayment as bigint,
  });
  console.log('txHash: https://explorer.hyperlane.xyz/?search=' + txHash);
};
