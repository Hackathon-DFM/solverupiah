import dayjs from 'dayjs';
import { ponder } from 'ponder:registry';
// import { account } from 'ponder:schema';
import { intent } from 'ponder:schema';
import { readableTimestamp } from './utils';

ponder.on('RouterArbi:Open', async ({ event, context }) => {
  // transactions
  const transactions = await context.db.find(intent, {
    id: event.args.orderId.toString(),
  });

  if (!transactions) {
    await context.db.insert(intent).values({
      id: event.args.orderId.toString(),
      isFilled: false,
      txHashOpen: event.transaction.hash,
      txHashFill: null, // wait for fill
      user: event.args.resolvedOrder.user,
      recipient: event.args.resolvedOrder.maxSpent[0]?.recipient,
      tokenFrom: event.args.resolvedOrder.maxSpent[0]?.token,
      tokenTo: event.args.resolvedOrder.minReceived[0]?.token,
      amount: event.args.resolvedOrder.maxSpent[0]?.amount,
      originChainId: event.args.resolvedOrder.originChainId.toString(),
      destChainId:
        event.args.resolvedOrder.fillInstructions[0]?.destinationChainId.toString(),
      timestamp: event.block.timestamp,
      timestampReadable: readableTimestamp(event.block.timestamp),
    });
  }
});
ponder.on('RouterArbi:Filled', async ({ event, context }) => {
  const transactions = await context.db.find(intent, {
    id: event.args.orderId.toString(),
  });
  if (transactions) {
    await context.db.update(intent, { id: event.args.orderId.toString() }).set({
      isFilled: true,
      txHashFill: event.transaction.hash,
    });
  }
});

ponder.on('RouterLisk:Filled', async ({ event, context }) => {
  const transactions = await context.db.find(intent, {
    id: event.args.orderId.toString(),
  });
  if (transactions) {
    await context.db.update(intent, { id: event.args.orderId.toString() }).set({
      isFilled: true,
      txHashFill: event.transaction.hash,
    });
  }
});
ponder.on('RouterLisk:Open', async ({ event, context }) => {
  // transactions
  const transactions = await context.db.find(intent, {
    id: event.args.orderId.toString(),
  });

  if (!transactions) {
    await context.db.insert(intent).values({
      id: event.args.orderId.toString(),
      isFilled: false,
      txHashOpen: event.transaction.hash,
      txHashFill: null, // wait for fill
      user: event.args.resolvedOrder.user,
      recipient: event.args.resolvedOrder.maxSpent[0]?.recipient,
      tokenFrom: event.args.resolvedOrder.maxSpent[0]?.token,
      tokenTo: event.args.resolvedOrder.minReceived[0]?.token,
      amount: event.args.resolvedOrder.maxSpent[0]?.amount,
      originChainId: event.args.resolvedOrder.originChainId.toString(),
      destChainId:
        event.args.resolvedOrder.fillInstructions[0]?.destinationChainId.toString(),
      timestamp: event.block.timestamp,
      timestampReadable: readableTimestamp(event.block.timestamp),
    });
  }
});
