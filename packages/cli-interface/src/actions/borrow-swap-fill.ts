import {
  OpenEventLog,
  addressToBytes32,
  ask,
  jsonStringifyBigInt,
  sleep,
} from '../utils';
import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  erc20Abi,
  maxUint256,
  decodeEventLog,
  zeroAddress,
  parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import {
  DESTINATION_LATTEPOOL_ADDRESS,
  DESTINATION_ROUTER_ADDRESS,
  DESTINATION_SWAPROUTER_ADDRESS,
  ORIGIN_ROUTER_ADDRESS,
  OUTTOKEN_ADDRESS,
  SEQUENCER_API_URL,
  SOLVER_PK,
} from '../config';
import routerAbi from '../abis/Hyperlane7683.json';
import { LattePoolAbi } from '../abis/LattePoolAbi';
import { MockSwapRouterAbi } from '../abis/MockSwapRouterAbi';

const walletAccount = privateKeyToAccount(SOLVER_PK as Address);
const walletClient = createWalletClient({
  account: walletAccount,
  chain: baseSepolia,
  transport: http(),
});

const publicClientOrigin = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
});

const publicClientDestination = createPublicClient({
  chain: baseSepolia,
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

export const borrowSwapFillIntent = async () => {
  // 0x42ef42ad105b203d96690d85a2ad830e43fd84b99ec09a922d82f44e640d62af
  const openTxHash = await ask('input the tx hash on origin chain');
  if (!openTxHash) return;

  const receipt = await publicClientOrigin.getTransactionReceipt({
    hash: openTxHash as Address,
  });

  const openEvent = receipt.logs
    .filter(
      (log) =>
        log.address.toLowerCase() === ORIGIN_ROUTER_ADDRESS?.toLowerCase(),
    )
    .map((log) => {
      return decodeEventLog({
        abi: routerAbi,
        data: log.data,
        topics: log.topics,
      });
    })
    .find((event) => event.eventName === 'Open') as unknown as OpenEventLog;

  console.log(jsonStringifyBigInt(openEvent));

  const orderId = openEvent.args.orderId;
  const originData =
    openEvent.args.resolvedOrder.fillInstructions[0].originData;
  const fillerData = addressToBytes32(walletAccount.address);

  const maxSpent = openEvent.args.resolvedOrder.maxSpent[0].amount;

  console.log('\nparams:');
  console.log({ orderId, originData, fillerData });

  const confirm = await ask('continue (Y/n)?');

  if (confirm === 'n') return;

  // borrow eth from baristanet

  // ----- (a) get signature from API -----

  type BorrowRequest = {
    solver: string;
    amount: string;
    contractAddress: string;
  };
  type BorrowResponse = {
    signature: string;
    sequencer: string;
    contractAddress: string;
    data: {
      solver: string;
      amount: string;
      maxDebt: string;
      deadline: string;
    };
  };
  const BORROW_AMOUNT = '0.001';

  const borrowRequest: BorrowRequest = {
    solver: walletAccount.address,
    amount: parseEther(BORROW_AMOUNT).toString(),
    contractAddress: DESTINATION_LATTEPOOL_ADDRESS as Address,
  };

  const borrowResponse = await fetch(`https://baristenet-sequencer.fly.dev/borrow`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: jsonStringifyBigInt(borrowRequest),
  });

  if (!borrowResponse.ok) {
    throw new Error(`HTTP error! status: ${borrowResponse.status}`);
  }

  const borrowData = (await borrowResponse.json()) as BorrowResponse;
  console.log('borrowData', borrowData);

  // ----- (b) borrow from contract -----

  const borrowTxHash = await walletClient.writeContract({
    address: borrowData.contractAddress as Address,
    abi: LattePoolAbi,
    functionName: 'borrowWithSig',
    args: [
      BigInt(borrowData.data.amount),
      BigInt(borrowData.data.maxDebt),
      BigInt(borrowData.data.deadline),
      borrowData.signature as Address,
    ],
  });
  console.log('borrowTxHash', borrowTxHash);

  await sleep(4000);

  // swap eth to token

  const swapTxHash = await walletClient.writeContract({
    address: DESTINATION_SWAPROUTER_ADDRESS as Address,
    abi: MockSwapRouterAbi,
    functionName: 'exactOutputSingle',
    args: [
      {
        tokenIn: zeroAddress,
        tokenOut: OUTTOKEN_ADDRESS as Address,
        fee: 0,
        recipient: walletAccount.address,
        deadline: maxUint256,
        amountOut: maxSpent,
        amountInMaximum: BigInt(borrowData.data.amount),
        sqrtPriceLimitX96: BigInt(0),
      },
    ],
    value: BigInt(borrowData.data.amount),
  });
  console.log('swapTxHash', swapTxHash);

  await sleep(4000);

  // approve token to be sent when filling

  const approvalTxHash = await approveToken(
    OUTTOKEN_ADDRESS as Address,
    DESTINATION_ROUTER_ADDRESS as Address,
    maxUint256,
  );
  console.log('approvalTxHash', approvalTxHash);

  await sleep(4000);

  // filling

  const txHash = await walletClient.writeContract({
    address: DESTINATION_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'fill',
    args: [orderId, originData, fillerData],
  });
  console.log('txHash', txHash);
};
