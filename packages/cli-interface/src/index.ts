import {
  fillIntent,
  openIntent,
  settleIntent,
  actorBalance,
  openIntentOrderStatus,
  borrowSwapFillIntent,
  createSignature,
} from './actions';
import minimist from 'minimist';
import { openForIntent } from './actions/openFor';

const args = minimist(process.argv.slice(2));

async function main() {
  const isOpen = args._.includes('open');
  const isFill = args._.includes('fill');
  const isSettle = args._.includes('settle');
  const isBalance = args._.includes('balance');
  const isStatus = args._.includes('status');
  const isBorrowSwapFill = args._.includes('borrow-swap-fill');
  const isOpenFor = args._.includes('open-for');

  if (isOpen) await openIntent();
  if (isFill) await fillIntent();
  if (isSettle) await settleIntent();
  if (isBalance) await actorBalance();
  if (isStatus) await openIntentOrderStatus();
  if (isBorrowSwapFill) await borrowSwapFillIntent();
  if (isOpenFor) await openForIntent();
}

main();
