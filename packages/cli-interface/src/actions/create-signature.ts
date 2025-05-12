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
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { liskSepolia } from 'viem/chains';
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

const domain = {
  name: 'Permit2',
  chainId: ORIGIN_DOMAIN, // replace with actual chainId
  verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3', // mainnet Permit2 address
};

const types = {
  PermitBatchTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions[]' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
  ],
};

const walletAccount = privateKeyToAccount(SENDER_PK as Address);
const walletClient = createWalletClient({
  account: walletAccount,
  chain: liskSepolia,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: liskSepolia,
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
    nonce: BigInt(0),
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

  const witness = await publicClient.readContract({
    address: ORIGIN_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'witnessHash',
    args: [resolvedOrder],
  });

  const getSignature = async () => {
    const signature = await walletClient.signTypedData({
      domain: {
        name: 'Permit2',
        chainId: ORIGIN_DOMAIN, // replace with actual chainId
        verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3', // mainnet Permit2 address
      },
      types: {
        PermitBatchTransferFrom: [
          { name: 'permitted', type: 'TokenPermissions[]' },
          { name: 'spender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
        TokenPermissions: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint160' },
        ],
      },
      primaryType: 'PermitBatchTransferFrom',
      message: {
        spender: ORIGIN_ROUTER_ADDRESS as Address,
        permitted: [
          {
            token: rawOrderData.inputToken as Address,
            amount: BigInt(rawOrderData.amountIn),
          },
        ],
        nonce: BigInt(timestamp),
        deadline: BigInt(rawOrderData.fillDeadline),
      },
    });
    return signature;
  };

  const signature = await getSignature();

  console.log('signature: ', signature);

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
