import { Address, PublicClient, stringToHex } from 'viem';
import todoListAbi from './abis/TodoList.json';
import { openEventAbi } from './types';
import { SolverParams } from './solver';
import { bytes32ToAddress, sleep } from './utils';
import routerAbi from './abis/Hyperlane7683.json';

type ListenerParams = {
  msg: string;
  ms: number;
  solver: (msg: string) => Promise<void>;
};

export async function listener({ msg, ms, solver }: ListenerParams) {
  setInterval(() => {
    solver(msg);
  }, ms);
}

type ClientListenerParams = {
  publicClient: PublicClient;
  contractAddress: Address;
  blockNumber?: bigint;
  solver: (args: SolverParams) => Promise<void>;
};

export async function openIntentListener({
  publicClient,
  contractAddress,
  blockNumber,
  solver,
}: ClientListenerParams) {
  let currentBlockNumber = await publicClient.getBlockNumber();
  let chainId = await publicClient.getChainId();

  // listening block number
  let fromBlock: bigint;
  let toBlock: bigint;
  if (blockNumber) {
    fromBlock = blockNumber;
  } else {
    fromBlock = currentBlockNumber;
  }
  const batch = 1000n;
  while (true) {
    if (fromBlock + batch > currentBlockNumber) {
      toBlock = currentBlockNumber;
    } else {
      toBlock = fromBlock + batch;
    }

    const logs = await publicClient.getLogs({
      address: contractAddress,
      event: openEventAbi,
      fromBlock,
      toBlock,
    });

    console.log(`[${chainId}] listening block ${fromBlock} to ${toBlock}`);
    if (logs.length) {
      const [openEvent] = logs;
      const {
        orderId,
        minReceived,
        maxSpent,
        fillInstructions,
        originChainId,
      } = openEvent.args.resolvedOrder!;
      const { originData } = fillInstructions[0];
      const {
        token, // token to send to destination (need to delete left zero padding)
        amount, // amount to send to destination
        chainId: destChainId, // destination chain id
        recipient, // need this address to be approved (need to delete left zero padding)
      } = maxSpent[0];

      const solverParams: SolverParams = {
        orderId,
        token: bytes32ToAddress(token),
        amount,
        originChainId,
        destChainId,
        originRouter: contractAddress,
        destRouter: bytes32ToAddress(recipient),
        originData,
      };

      console.log('Open event detected', {
        orderId,
        inToken: {
          chainId: originChainId,
          token: bytes32ToAddress(minReceived[0].token),
          amount: minReceived[0].amount,
        },
        outToken: {
          chainId: destChainId,
          token: bytes32ToAddress(token),
          amount,
        },
      });

      await solver(solverParams);
    }

    fromBlock = toBlock;

    await sleep(5000);
    currentBlockNumber = await publicClient.getBlockNumber();
  }
}
