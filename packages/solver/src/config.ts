import dotenv from 'dotenv';

dotenv.config();

export const SOLVER_PK = process.env.SOLVER_PK;
if (!SOLVER_PK) {
  throw new Error('SOLVER_PK is required');
}

export const ORIGIN_LATTEPOOL_ADDRESS = process.env.ORIGIN_LATTEPOOL_ADDRESS;
if (!ORIGIN_LATTEPOOL_ADDRESS) {
  throw new Error('ORIGIN_LATTEPOOL_ADDRESS is required');
}

export const DESTINATION_LATTEPOOL_ADDRESS =
  process.env.DESTINATION_LATTEPOOL_ADDRESS;
if (!DESTINATION_LATTEPOOL_ADDRESS) {
  throw new Error('DESTINATION_LATTEPOOL_ADDRESS is required');
}

export const ORIGIN_SWAPROUTER_ADDRESS = process.env.ORIGIN_SWAPROUTER_ADDRESS;
if (!ORIGIN_SWAPROUTER_ADDRESS) {
  throw new Error('ORIGIN_SWAPROUTER_ADDRESS is required');
}

export const DESTINATION_SWAPROUTER_ADDRESS =
  process.env.DESTINATION_SWAPROUTER_ADDRESS;
if (!DESTINATION_SWAPROUTER_ADDRESS) {
  throw new Error('DESTINATION_SWAPROUTER_ADDRESS is required');
}
