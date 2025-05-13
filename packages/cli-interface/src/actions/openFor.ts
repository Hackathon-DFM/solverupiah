import {
  FILL_DEADLINE,
  OnchainCrossChainOrder,
  OrderData,
  OrderEncoder,
  addressToBytes32,
  ask,
  sleep,
  writeJson,
} from '../utils';
import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  zeroHash,
  erc20Abi,
  maxUint256,
  parseEther,
  parseUnits,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import {
  DESTINATION_ROUTER_ADDRESS,
  INTOKEN_ADDRESS,
  ORIGIN_ROUTER_ADDRESS,
  OUTTOKEN_ADDRESS,
  RECIPIENT_ADDRESS,
  SENDER_PK,
  ORIGIN_DOMAIN,
  DESTINATION_DOMAIN,
  SOLVER_PK,
} from '../config';
import routerAbi from '../abis/Hyperlane7683.json';
import { createSignature } from './create-signature';

const walletAccount = privateKeyToAccount(SOLVER_PK as Address);
const walletClient = createWalletClient({
  account: walletAccount,
  chain: arbitrumSepolia,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
});

// ganti jadi openFor
export const openForIntent = async () => {
  const { order, signature } = await createSignature();

  const txHash = await walletClient.writeContract({
    address: ORIGIN_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'openFor',
    args: [order, signature, '0x'],
  });

  console.log(txHash);
};
