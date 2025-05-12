import { onchainTable } from 'ponder';

export const intent = onchainTable('intent', (t) => ({
  id: t.text().primaryKey(), // event.log.id
  isFilled: t.boolean().default(false), // "open" (you can update to "filled" later if needed)
  txHashOpen: t.hex(),
  txHashFill: t.hex(),
  user: t.hex(),
  recipient: t.hex(),
  tokenFrom: t.hex(), // from maxSpent[0].token
  tokenTo: t.hex(), // to minReceived[0].token
  amount: t.bigint(), // from maxSpent[0].amount (or sum if needed)
  originChainId: t.varchar(),
  destChainId: t.varchar(), // from fillInstructions[0].destinationChainId
  timestamp: t.bigint(),
  timestampReadable: t.varchar(),
}));
