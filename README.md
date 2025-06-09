# Timeline Aggregation Protocol Subgraph (TAP Subgraph)

## Build and deploy

Be sure to check `package.json` where the yarn commands are defined.

```sh
# Install dependencies
yarn
# Build AssemblyScript types using `schema.graphql` and `subgraph.yaml`.
yarn codegen
# Build subgraph
yarn build
# Create a subgraph name locally
yarn create-local
# Deploy subgraph code under name created above
yarn deploy-local
```

The subgraph will immediately start indexing. You will be able to query
the subgraph immediately on port `8000` (most recent will only be available after reaching chain head).

## Development flow

`yarn create-local` needs to be executed only once. Thereafter, you can replace the
subgraph code under the created name.

```sh
yarn codegen  # Only if subgraph.yaml or schema.graphql changed.
yarn build
yarn deploy-local
```

It will stop indexing the old code, and start the new one in its place.

## Deploying locally

Inside /test are the tools to help you test locally this subgraph
Requirements are:

- jq
- yq
- Node (personally I use 16.14.2)

### Run podman-compose up/ docker-compose up

The file should run as is

### Execute contract_init.sh

This will execute several commands where the contracts attached in the git submodule of timeline-aggregation-protocol-contracts will be executed.

After finishing it will print out the result like this (just in case you want to test something else after):

```terminal
Graph token address: 0xe982E462b094850F12AF94d21D470e21bE9D0E9C
Step 2: Obtain allocation tracker address
Allocation tracker address: 0x25AF99b922857C37282f578F428CB7f34335B379
Step 3: Obtain istaking address
Istaking address: 0xd611F1AF9D056f00F49CB036759De2753EfA82c2
Step 4: Obtain TAPVerifier address
Tap verifier address: 0x995629b19667Ae71483DC812c1B5a35fCaaAF4B8
Step 5: Obtain Escrow address
Escrow address: 0x94dFeceb91678ec912ef8f14c72721c102ed2Df7
```

Afterwards it's going to run `contract_calls.py` to handle all different calls to catch later in the subgraph.

Finally it will deploy the subgraph locally to <http://127.0.0.1:8000/subgraphs/name/semiotic/tap/graphql>.

### If more tests are needed you can run files individually

#### Build and deploy locally

```sh
# Install dependencies
yarn
# Build AssemblyScript types using `schema.graphql` and `subgraph.yaml`.
yarn codegen
# Build subgraph
yarn build
# Create a subgraph name locally
yarn create-local
# Deploy subgraph code under name created above
yarn deploy-local
```

#### Run contract_calls.py

This will execute all the calls towards the escrow contract and the subgraph will index all this new entries.

Authorization for a signer and redeeming will only work the first time, else the data needs to be changed (you can just rerun contract_init.sh and resets all).

## Deploying to a testnet

### Deploy your subgraph into graph studio

Follow the instructions at <https://thegraph.com/docs/en/deploying/deploying-a-subgraph-to-studio/>.

Then, go to `testnet-calls.py` and add your mnemonic in order to provide access to your wallet.

Afterwards run `python testnet-calls.py` with the arg `eth-goerli` for eth-goerli testnet or `arbitrum-goerli` for arbitrum-goerli testnet. A secondary arg is needed where you will send your wallet mnemonic as a string.
