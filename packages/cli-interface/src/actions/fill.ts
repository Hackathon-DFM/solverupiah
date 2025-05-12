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
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { liskSepolia, arbitrumSepolia } from 'viem/chains';
import {
  DESTINATION_ROUTER_ADDRESS,
  ORIGIN_ROUTER_ADDRESS,
  OUTTOKEN_ADDRESS,
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

export const fillIntent = async () => {
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

  console.log('\nparams:');
  console.log({ orderId, originData, fillerData });

  const confirm = await ask('continue (Y/n)?');

  if (confirm === 'n') return;

  const approvalTxHash = await approveToken(
    OUTTOKEN_ADDRESS as Address,
    DESTINATION_ROUTER_ADDRESS as Address,
    maxUint256,
  );
  console.log('approvalTxHash', approvalTxHash);

  await sleep(2000);

  const txHash = await walletClient.writeContract({
    address: DESTINATION_ROUTER_ADDRESS as Address,
    abi: routerAbi,
    functionName: 'fill',
    args: [orderId, originData, fillerData],
  });
  console.log('txHash', txHash);
};
