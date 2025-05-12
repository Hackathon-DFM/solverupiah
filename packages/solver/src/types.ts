export const openEventAbi = {
  type: 'event',
  name: 'Open',
  inputs: [
    {
      name: 'orderId',
      type: 'bytes32',
      indexed: true,
      internalType: 'bytes32',
    },
    {
      name: 'resolvedOrder',
      type: 'tuple',
      indexed: false,
      internalType: 'struct ResolvedCrossChainOrder',
      components: [
        {
          name: 'user',
          type: 'address',
          internalType: 'address',
        },
        {
          name: 'originChainId',
          type: 'uint256',
          internalType: 'uint256',
        },
        {
          name: 'openDeadline',
          type: 'uint32',
          internalType: 'uint32',
        },
        {
          name: 'fillDeadline',
          type: 'uint32',
          internalType: 'uint32',
        },
        {
          name: 'orderId',
          type: 'bytes32',
          internalType: 'bytes32',
        },
        {
          name: 'maxSpent',
          type: 'tuple[]',
          internalType: 'struct Output[]',
          components: [
            {
              name: 'token',
              type: 'bytes32',
              internalType: 'bytes32',
            },
            {
              name: 'amount',
              type: 'uint256',
              internalType: 'uint256',
            },
            {
              name: 'recipient',
              type: 'bytes32',
              internalType: 'bytes32',
            },
            {
              name: 'chainId',
              type: 'uint256',
              internalType: 'uint256',
            },
          ],
        },
        {
          name: 'minReceived',
          type: 'tuple[]',
          internalType: 'struct Output[]',
          components: [
            {
              name: 'token',
              type: 'bytes32',
              internalType: 'bytes32',
            },
            {
              name: 'amount',
              type: 'uint256',
              internalType: 'uint256',
            },
            {
              name: 'recipient',
              type: 'bytes32',
              internalType: 'bytes32',
            },
            {
              name: 'chainId',
              type: 'uint256',
              internalType: 'uint256',
            },
          ],
        },
        {
          name: 'fillInstructions',
          type: 'tuple[]',
          internalType: 'struct FillInstruction[]',
          components: [
            {
              name: 'destinationChainId',
              type: 'uint256',
              internalType: 'uint256',
            },
            {
              name: 'destinationSettler',
              type: 'bytes32',
              internalType: 'bytes32',
            },
            {
              name: 'originData',
              type: 'bytes',
              internalType: 'bytes',
            },
          ],
        },
      ],
    },
  ],
  anonymous: false,
} as const;
