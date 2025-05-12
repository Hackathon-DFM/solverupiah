import { ask, hexToOrderStatus, OrderStatus } from '../utils';
import {
  Address,
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { liskSepolia, arbitrumSepolia } from 'viem/chains';
import {
  DESTINATION_ROUTER_ADDRESS,
  ORIGIN_ROUTER_ADDRESS,
  SOLVER_PK,
} from '../config';
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

const getOrderStatus = async (
  orderId: Address,
): Promise<{
  originOrderStatus: OrderStatus;
  destOrderStatus: OrderStatus;
}> => {
  const originOrderStatusHex = (await publicClientOrigin.readContract({
    address: ORIGIN_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'orderStatus',
    args: [orderId],
  })) as Address;

  const destOrderStatusHex = (await publicClientDestination.readContract({
    address: DESTINATION_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'orderStatus',
    args: [orderId],
  })) as Address;

  const originOrderStatus = hexToOrderStatus(originOrderStatusHex);
  const destOrderStatus = hexToOrderStatus(destOrderStatusHex);
  return { originOrderStatus, destOrderStatus };
};

export const openIntentOrderStatus = async () => {
  const orderId = await ask('input the orderId that want to be checked');
  if (!orderId) return;

  const { originOrderStatus, destOrderStatus } = await getOrderStatus(
    orderId as Address,
  );

  console.table([
    {
      'Arbitrum Sepolia': originOrderStatus,
      'Base Sepolia': destOrderStatus,
    },
  ]);
};
