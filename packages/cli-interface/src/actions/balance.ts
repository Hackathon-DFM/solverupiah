import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  zeroHash,
  erc20Abi,
  maxUint256,
  parseEther,
  formatEther,
  formatUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { liskSepolia, arbitrumSepolia } from 'viem/chains';
import {
  INTOKEN_ADDRESS,
  OUTTOKEN_ADDRESS,
  SENDER_ADDRESS,
  RECIPIENT_ADDRESS,
  SOLVER_ADDRESS,
} from '../config';

const originClient = createPublicClient({
  chain: liskSepolia,
  transport: http(),
});

const destinationClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
});

export const actorBalance = async () => {
  const senderFooBalance = await originClient.readContract({
    address: INTOKEN_ADDRESS as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [SENDER_ADDRESS as Address],
  });
  const senderBarBalance = await destinationClient.readContract({
    address: OUTTOKEN_ADDRESS as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [SENDER_ADDRESS as Address],
  });

  const recipientBarBalance = await destinationClient.readContract({
    address: OUTTOKEN_ADDRESS as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [RECIPIENT_ADDRESS as Address],
  });
  const recipientFooBalance = await originClient.readContract({
    address: INTOKEN_ADDRESS as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [RECIPIENT_ADDRESS as Address],
  });

  const solverFooBalance = await originClient.readContract({
    address: INTOKEN_ADDRESS as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [SOLVER_ADDRESS as Address],
  });
  const solverBarBalance = await destinationClient.readContract({
    address: OUTTOKEN_ADDRESS as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [SOLVER_ADDRESS as Address],
  });

  const balanceTable = [
    {
      name: 'Sender',
      address: SENDER_ADDRESS,
      fooBalance: formatUnits(senderFooBalance, 2),
      barBalance: formatUnits(senderBarBalance, 2),
    },
    {
      name: 'Solver',
      address: SOLVER_ADDRESS,
      fooBalance: formatUnits(solverFooBalance, 2),
      barBalance: formatUnits(solverBarBalance, 2),
    },
    {
      name: 'Recipient',
      address: RECIPIENT_ADDRESS,
      fooBalance: formatUnits(recipientFooBalance, 2),
      barBalance: formatUnits(recipientBarBalance, 2),
    },
  ];

  console.table(balanceTable);
};
