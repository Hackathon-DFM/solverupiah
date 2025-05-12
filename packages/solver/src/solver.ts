import {
  Address,
  erc20Abi,
  formatUnits,
  maxUint256,
  parseEther,
  stringToHex,
  zeroAddress,
} from 'viem';
import {
  addressToBytes32,
  createClient,
  sleep,
  OrderStatus,
  hexToOrderStatus,
  jsonStringifyBigInt,
} from './utils';
import routerAbi from './abis/Hyperlane7683.json';
import { LattePoolAbi } from './abis/LattePoolAbi';
import { MockSwapRouterAbi } from './abis/MockSwapRouterAbi';
import {
  DESTINATION_LATTEPOOL_ADDRESS,
  DESTINATION_SWAPROUTER_ADDRESS,
} from './config';

export type SolverParams = {
  originChainId: bigint;
  destChainId: bigint;
  token: Address;
  amount: bigint;
  destRouter: Address;
  originRouter: Address;
  originData: Address; // ABI-encoded blob (bytes)
  orderId: Address;
};

export async function openIntentSolver({
  originChainId,
  destChainId,
  token,
  amount,
  originRouter,
  destRouter,
  originData,
  orderId,
}: SolverParams) {
  const originClient = createClient(originChainId);
  const destClient = createClient(destChainId);

  const getOrderStatus = async (
    orderId: Address,
  ): Promise<{
    originOrderStatus: OrderStatus;
    destOrderStatus: OrderStatus;
  }> => {
    const originOrderStatusHex = (await originClient.publicClient.readContract({
      address: originRouter,
      abi: routerAbi,
      functionName: 'orderStatus',
      args: [orderId],
    })) as Address;

    const destOrderStatusHex = (await destClient.publicClient.readContract({
      address: destRouter,
      abi: routerAbi,
      functionName: 'orderStatus',
      args: [orderId],
    })) as Address;

    const originOrderStatus = hexToOrderStatus(originOrderStatusHex);
    const destOrderStatus = hexToOrderStatus(destOrderStatusHex);
    return { originOrderStatus, destOrderStatus };
  };

  let orderStatus;
  orderStatus = await getOrderStatus(orderId);

  if (
    orderStatus.originOrderStatus === 'OPENED' &&
    orderStatus.destOrderStatus !== 'FILLED'
  ) {
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
      solver: destClient.walletAccount.address,
      amount: parseEther(BORROW_AMOUNT).toString(),
      contractAddress: DESTINATION_LATTEPOOL_ADDRESS as Address,
    };

    const borrowResponse = await fetch('https://baristenet-sequencer.fly.dev/borrow', {
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

    const borrowTxHash = await destClient.walletClient.writeContract({
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

    const swapTxHash = await destClient.walletClient.writeContract({
      address: DESTINATION_SWAPROUTER_ADDRESS as Address,
      abi: MockSwapRouterAbi,
      functionName: 'exactOutputSingle',
      args: [
        {
          tokenIn: zeroAddress,
          tokenOut: token,
          fee: 0,
          recipient: destClient.walletAccount.address,
          deadline: maxUint256,
          amountOut: amount,
          amountInMaximum: BigInt(borrowData.data.amount),
          sqrtPriceLimitX96: BigInt(0),
        },
      ],
      value: BigInt(borrowData.data.amount),
    });
    console.log('swapTxHash', swapTxHash);

    await sleep(4000);

    // APPROVE
    const approveTxHash = await destClient.walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: 'approve',
      args: [destRouter, amount],
    });

    console.log('approve txHash', approveTxHash);

    await sleep(4000);

    // CHECK TOKEN BALANCE

    const balance = await destClient.publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [destClient.walletAccount.address],
    });

    if (balance < amount) {
      console.log('balance not enough');
      return;
    }

    // FILL

    const fillerData = addressToBytes32(destClient.walletAccount.address);
    const fillTxHash = await destClient.walletClient.writeContract({
      address: destRouter as Address,
      abi: routerAbi,
      functionName: 'fill',
      args: [orderId, originData, fillerData],
    });
    console.log('fill txHash', fillTxHash);

    await sleep(4000);
  } else {
    console.log('order already filled');
  }

  if ((await getOrderStatus(orderId)).originOrderStatus !== 'SETTLED') {
    // CHECK SETTLE BALANCE

    const quoteGasPayment = (await destClient.publicClient.readContract({
      address: destRouter as Address,
      abi: routerAbi,
      functionName: 'quoteGasPayment',
      args: [421614],
    })) as bigint;

    console.log(
      'quoteGasPayment: ',
      formatUnits(quoteGasPayment as bigint, 18),
    );

    // eth balance
    const ethBalance = await destClient.publicClient.getBalance({
      address: destClient.walletAccount.address,
    });

    if (ethBalance < quoteGasPayment) {
      console.log('eth balance not enough');
      return;
    }

    // SETTLE

    await sleep(4000);

    const txHash = await destClient.walletClient.writeContract({
      address: destRouter as Address,
      abi: routerAbi,
      functionName: 'settle',
      args: [[orderId]],
      value: quoteGasPayment as bigint,
    });

    console.log('txHash: https://explorer.hyperlane.xyz/?search=' + txHash);
  } else {
    console.log('order already settled');
  }
}
