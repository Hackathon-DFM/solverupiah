import {
  FILL_DEADLINE,
  GaslessCrossChainOrder,
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
  parseSignature,
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
  PERMIT2_ADDRESS,
} from '../config';
import routerAbi from '../abis/Hyperlane7683.json';

import { PermitBatchTransferFrom } from '@uniswap/permit2-sdk';

type Output = {
  token: `0x${string}` | `0x${string}`; // assumed bytes32
  amount: bigint;
  recipient: `0x${string}`; // assumed bytes32
  chainId: bigint; // uint64
};

type FillInstruction = {
  destinationChainId: bigint; // uint64
  destinationSettler: `0x${string}`; // bytes32
  originData: `0x${string}`; // bytes
};

export type ResolvedCrossChainOrder = {
  user: `0x${string}`; // address
  originChainId: bigint; // uint64
  openDeadline: number; // uint32
  fillDeadline: number; // uint32
  maxSpent: Output[];
  minReceived: Output[];
  fillInstructions: FillInstruction[];
};

const walletAccount = privateKeyToAccount(SENDER_PK as Address);
const walletClient = createWalletClient({
  account: walletAccount,
  chain: arbitrumSepolia,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
});

const approveToken = async (
  token: Address,
  spender: Address,
  amount: bigint,
): Promise<string> => {
  const txHash = await walletClient.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amount],
  });

  return txHash;
};

export const createSignature = async () => {
  // swap 8 FOO to 11 BAR
  const { timestamp } = await publicClient.getBlock();
  const permitNonce = BigInt(0);

  const rawOrderData: OrderData = {
    sender: walletAccount.address,
    recipient: RECIPIENT_ADDRESS as Address,
    inputToken: INTOKEN_ADDRESS as Address,
    outputToken: OUTTOKEN_ADDRESS as Address,
    amountIn: BigInt(parseUnits('10', 2)),
    amountOut: BigInt(parseEther('20')),
    senderNonce: timestamp,
    originDomain: ORIGIN_DOMAIN,
    destinationDomain: DESTINATION_DOMAIN,
    destinationSettler: DESTINATION_ROUTER_ADDRESS as Address,
    fillDeadline: FILL_DEADLINE,
    data: '0x',
  };

  const orderData: OrderData = {
    ...rawOrderData,
    sender: addressToBytes32(rawOrderData.sender),
    recipient: addressToBytes32(rawOrderData.recipient),
    inputToken: addressToBytes32(rawOrderData.inputToken),
    outputToken: addressToBytes32(rawOrderData.outputToken),
    destinationSettler: addressToBytes32(rawOrderData.destinationSettler),
  };

  const order: GaslessCrossChainOrder = {
    originSettler: ORIGIN_ROUTER_ADDRESS as Address,
    user: rawOrderData.sender,
    nonce: permitNonce,
    originChainId: BigInt(rawOrderData.originDomain),
    openDeadline: orderData.fillDeadline,
    fillDeadline: orderData.fillDeadline,
    orderDataType: OrderEncoder.orderDataType(),
    orderData: OrderEncoder.encode(orderData),
  };

  await approveToken(
    INTOKEN_ADDRESS as Address,
    PERMIT2_ADDRESS as Address,
    maxUint256,
  );

  const resolvedOrder = await publicClient.readContract({
    address: ORIGIN_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'resolveFor',
    args: [order, '0x'],
  });

  const getSignature = async () => {
    const signature = await walletClient.signTypedData({
      domain: {
        name: 'Permit2',
        chainId: ORIGIN_DOMAIN, // replace with actual chainId
        verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3', // mainnet Permit2 address
      },
      types: {
        PermitBatchWitnessTransferFrom: [
          { name: 'permitted', type: 'TokenPermissions[]' },
          { name: 'spender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'witness', type: 'ResolvedCrossChainOrder' },
        ],
        TokenPermissions: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        ResolvedCrossChainOrder: [
          { name: 'user', type: 'address' },
          { name: 'originChainId', type: 'uint64' },
          { name: 'openDeadline', type: 'uint32' },
          { name: 'fillDeadline', type: 'uint32' },
          { name: 'maxSpent', type: 'Output[]' },
          { name: 'minReceived', type: 'Output[]' },
          { name: 'fillInstructions', type: 'FillInstruction[]' },
        ],
        Output: [
          { name: 'token', type: 'bytes32' },
          { name: 'amount', type: 'uint256' },
          { name: 'recipient', type: 'bytes32' },
          { name: 'chainId', type: 'uint64' },
        ],
        FillInstruction: [
          { name: 'destinationChainId', type: 'uint64' },
          { name: 'destinationSettler', type: 'bytes32' },
          { name: 'originData', type: 'bytes' },
        ],
      },
      primaryType: 'PermitBatchWitnessTransferFrom',
      message: {
        spender: ORIGIN_ROUTER_ADDRESS as Address,
        permitted: [
          {
            token: rawOrderData.inputToken as Address,
            amount: BigInt(rawOrderData.amountIn),
          },
        ],
        nonce: permitNonce,
        deadline: BigInt(rawOrderData.fillDeadline),
        witness: resolvedOrder as ResolvedCrossChainOrder,
      },
    });
    return signature;
  };

  const signature = await getSignature();
  const { v, r, s } = parseSignature(signature);

  console.log('resolvedOrder: ', resolvedOrder);
  console.log('signature: ', signature);
  console.log({ v, r, s });

  return {
    order,
    signature,
  };

  // const order: OnchainCrossChainOrder = {
  //   fillDeadline: orderData.fillDeadline,
  //   orderDataType: OrderEncoder.orderDataType(),
  //   orderData: OrderEncoder.encode(orderData),
  // };

  // console.log('open intent using this default args');

  // const decodeOrderData = OrderEncoder.decode(order.orderData);
  // console.log('decodeOrderData', decodeOrderData);

  // const confirm = await ask('continue (Y/n)?');

  // if (confirm === 'n') return;

  // // check isValidNonce
  // const isValidNonce = await publicClient.readContract({
  //   address: ORIGIN_ROUTER_ADDRESS as Address,
  //   abi: routerAbi,
  //   functionName: 'isValidNonce',
  //   args: [rawOrderData.sender, rawOrderData.senderNonce],
  // });

  // if (!isValidNonce) {
  //   console.log('invalid nonce: ', rawOrderData.senderNonce);
  //   return;
  // }

  // const approvalTxHash = await approveToken(
  //   INTOKEN_ADDRESS as Address,
  //   ORIGIN_ROUTER_ADDRESS as Address,
  //   maxUint256,
  // );
  // console.log('approvalTxHash', approvalTxHash);

  // await sleep(4000);

  // const txHash = await walletClient.writeContract({
  //   address: ORIGIN_ROUTER_ADDRESS as Address,
  //   abi: routerAbi,
  //   functionName: 'open',
  //   args: [order],
  // });
  // console.log('txHash', txHash);
};
