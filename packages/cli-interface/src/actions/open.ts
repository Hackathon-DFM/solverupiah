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
} from '../config';
import routerAbi from '../abis/Hyperlane7683.json';

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

export const openIntent = async () => {
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

  const order: OnchainCrossChainOrder = {
    fillDeadline: orderData.fillDeadline,
    orderDataType: OrderEncoder.orderDataType(),
    orderData: OrderEncoder.encode(orderData),
  };

  console.log('open intent using this default args');

  const decodeOrderData = OrderEncoder.decode(order.orderData);
  console.log('decodeOrderData', decodeOrderData);

  const confirm = await ask('continue (Y/n)?');

  if (confirm === 'n') return;

  // check isValidNonce
  const isValidNonce = await publicClient.readContract({
    address: ORIGIN_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'isValidNonce',
    args: [rawOrderData.sender, rawOrderData.senderNonce],
  });

  if (!isValidNonce) {
    console.log('invalid nonce: ', rawOrderData.senderNonce);
    return;
  }

  const approvalTxHash = await approveToken(
    INTOKEN_ADDRESS as Address,
    ORIGIN_ROUTER_ADDRESS as Address,
    maxUint256,
  );
  console.log('approvalTxHash', approvalTxHash);

  await sleep(4000);

  const txHash = await walletClient.writeContract({
    address: ORIGIN_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'open',
    args: [order],
  });
  console.log('txHash', txHash);
};
