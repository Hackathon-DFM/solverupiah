import {
  encodeAbiParameters,
  decodeAbiParameters,
  keccak256,
  encodePacked,
  slice,
  pad,
  numberToHex,
  Address,
  stringToHex,
} from 'viem';
import readline from 'readline';
import fs from 'fs/promises';

// ████ Common █████████████████████████████████████████████████████████████████

export function ask(question: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question + ': ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function writeJson(path: string, data: any) {
  await fs.writeFile(path, JSON.stringify(data, null, 2));
}

export function jsonStringifyBigInt(json: any) {
  return JSON.stringify(
    json,
    (_, value) => (typeof value === 'bigint' ? value.toString() : value),
    2,
  );
}

// type(uint32).max
export const FILL_DEADLINE = 4294967295;

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ████ TypeCasts ██████████████████████████████████████████████████████████████

export function addressToBytes32(address: Address): Address {
  const addrBigInt = BigInt(address);
  return pad(numberToHex(addrBigInt), { size: 32 });
}

export function bytes32ToAddress(bytes32: Address): Address {
  // Keep only the last 20 bytes (right-most 40 hex characters)
  return slice(bytes32, -20);
}

// ████ ERC7683 ████████████████████████████████████████████████████████████████

export type OrderStatus = 'FILLED' | 'OPENED' | 'SETTLED' | 'UNKNOWN';
export const hexToOrderStatus = (orderStatusHex: Address): OrderStatus => {
  const orderStatusMap = {
    OPENED: stringToHex('OPENED', { size: 32 }),
    FILLED: stringToHex('FILLED', { size: 32 }),
    SETTLED: stringToHex('SETTLED', { size: 32 }),
  };

  let orderStatus: OrderStatus = 'UNKNOWN';
  if (orderStatusHex === orderStatusMap.OPENED) {
    orderStatus = 'OPENED';
  } else if (orderStatusHex === orderStatusMap.FILLED) {
    orderStatus = 'FILLED';
  } else if (orderStatusHex === orderStatusMap.SETTLED) {
    orderStatus = 'SETTLED';
  }
  return orderStatus;
};

export type OnchainCrossChainOrder = {
  fillDeadline: number;
  orderDataType: Address;
  orderData: Address;
};

export type OpenEventLog = {
  eventName: 'Open';
  args: {
    orderId: Address;
    resolvedOrder: ResolvedOrder;
  };
};

export type ResolvedOrder = {
  user: Address;
  originChainId: bigint;
  openDeadline: number;
  fillDeadline: number;
  orderId: Address;
  maxSpent: TokenAmount[];
  minReceived: TokenAmount[];
  fillInstructions: FillInstruction[];
};

export type TokenAmount = {
  token: Address;
  amount: bigint;
  recipient: Address;
  chainId: bigint;
};

export type FillInstruction = {
  destinationChainId: bigint;
  destinationSettler: Address;
  originData: Address; // ABI-encoded blob (bytes)
};

// ████ OrderEncoder ███████████████████████████████████████████████████████████

export type OrderData = {
  sender: Address;
  recipient: Address;
  inputToken: Address;
  outputToken: Address;
  amountIn: bigint;
  amountOut: bigint;
  senderNonce: bigint;
  originDomain: number;
  destinationDomain: number;
  destinationSettler: Address;
  fillDeadline: number;
  data: Address;
};

const ORDER_DATA_TYPE_STRING = [
  'bytes32 sender',
  'bytes32 recipient',
  'bytes32 inputToken',
  'bytes32 outputToken',
  'uint256 amountIn',
  'uint256 amountOut',
  'uint256 senderNonce',
  'uint32 originDomain',
  'uint32 destinationDomain',
  'bytes32 destinationSettler',
  'uint32 fillDeadline',
  'bytes data',
].join(',');

const ORDER_DATA_TYPE_HASH = keccak256(
  encodePacked(['string'], [`OrderData(${ORDER_DATA_TYPE_STRING})`]),
);

export const OrderEncoder = {
  orderDataType: () => ORDER_DATA_TYPE_HASH,

  // abi.encode(order)
  encode: (order: OrderData): Address => {
    const encodedStructBody = encodeAbiParameters(
      [
        { name: 'sender', type: 'bytes32' },
        { name: 'recipient', type: 'bytes32' },
        { name: 'inputToken', type: 'bytes32' },
        { name: 'outputToken', type: 'bytes32' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOut', type: 'uint256' },
        { name: 'senderNonce', type: 'uint256' },
        { name: 'originDomain', type: 'uint32' },
        { name: 'destinationDomain', type: 'uint32' },
        { name: 'destinationSettler', type: 'bytes32' },
        { name: 'fillDeadline', type: 'uint32' },
        { name: 'data', type: 'bytes' },
      ],
      [
        order.sender,
        order.recipient,
        order.inputToken,
        order.outputToken,
        order.amountIn,
        order.amountOut,
        order.senderNonce,
        order.originDomain,
        order.destinationDomain,
        order.destinationSettler,
        order.fillDeadline,
        order.data,
      ],
    );
    const offset =
      '0x0000000000000000000000000000000000000000000000000000000000000020';
    return `${offset}${encodedStructBody.slice(2)}`;
  },

  // (OrderData memory orderData) = abi.decode(orderBytes, (OrderData))
  decode: (encoded: Address): OrderData => {
    // Strip the first 32 bytes (offset)
    const encodedStruct = `0x${encoded.slice(66)}`;

    const [
      sender,
      recipient,
      inputToken,
      outputToken,
      amountIn,
      amountOut,
      senderNonce,
      originDomain,
      destinationDomain,
      destinationSettler,
      fillDeadline,
      data,
    ] = decodeAbiParameters(
      [
        { name: 'sender', type: 'bytes32' },
        { name: 'recipient', type: 'bytes32' },
        { name: 'inputToken', type: 'bytes32' },
        { name: 'outputToken', type: 'bytes32' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOut', type: 'uint256' },
        { name: 'senderNonce', type: 'uint256' },
        { name: 'originDomain', type: 'uint32' },
        { name: 'destinationDomain', type: 'uint32' },
        { name: 'destinationSettler', type: 'bytes32' },
        { name: 'fillDeadline', type: 'uint32' },
        { name: 'data', type: 'bytes' },
      ],
      encodedStruct as Address,
    );

    return {
      sender,
      recipient,
      inputToken,
      outputToken,
      amountIn,
      amountOut,
      senderNonce,
      originDomain,
      destinationDomain,
      destinationSettler,
      fillDeadline,
      data,
    };
  },

  id: (order: OrderData): Address => {
    return keccak256(OrderEncoder.encode(order));
  },
};
