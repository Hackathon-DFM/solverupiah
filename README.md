# Baristanet Monorepo

## Quickstart

```sh
pnpm install
```

### Run the Solver

fill the env at `packages/solver/.env`
```
SOLVER_PK=

```

run the solver listener
```sh
cd packages/solver
pnpm dev
```

### Try Open an Intent

change project directory
```sh
cd packages/cli-interface
```

fill the env at `packages/cli-interface/.env`
```
SENDER_ADDRESS=
SOLVER_ADDRESS=
RECIPIENT_ADDRESS=

SENDER_PK=
SOLVER_PK=

INTOKEN_ADDRESS=
OUTTOKEN_ADDRESS=

ORIGIN_ROUTER_ADDRESS=
DESTINATION_ROUTER_ADDRESS=

ORIGIN_DOMAIN=
DESTINATION_DOMAIN=
```

#### Open intent
if you are already running the solver listener, the intent should be filled automatically (if balance is enough)
```sh
pnpm dev open
```

#### Fill intent
```sh
pnpm dev open
```

#### Settle intent
```sh
pnpm dev open
```

#### Check intent status
```sh
pnpm dev status
```

#### Check balance
```sh
pnpm dev balance
```

### Run the Sequencer

change project directory
```sh
cd packages/sequencer
```
fill the env at `packages/sequencer/.env.local`
```
# Mainnet RPC URL used for fetching blockchain data. Alchemy is recommended.
BREWHOUSE_RPC=https://arbitrum-sepolia-rpc.publicnode.com
LATTEPOOL_RPC=https://base-sepolia-rpc.publicnode.com
SEQUENCER_PRIVATE_KEY=

# (Optional) Postgres database URL. If not provided, SQLite will be used. 
DATABASE_URL=

```

run the sequencer locally
```sh
pnpm dev
```

then visit `http://127.0.0.1:42069/solvers/<solver_address>` to see the solver exposure including collateral and debts accross network

