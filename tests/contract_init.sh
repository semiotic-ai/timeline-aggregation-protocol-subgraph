#!/bin/bash
set -e

GATEWAY=0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1
SIGNER=0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0
RECEIVER=0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b

# Obtain curren dir
current_dir=$(pwd)

echo "Step 1: Run graph contracts"
cd $current_dir/contracts
yarn
echo "Running node contract deploy"
FULL_CMD_LOG="$(yes | yarn deploy-localhost --auto-mine)"
echo "Obtaining Graph address token"
GRAPH_TOKEN=$(jq '."1337".GraphToken.address' addresses.json -r)


command cd $current_dir/timeline-aggregation-protocol-contracts
echo "Graph token address: $GRAPH_TOKEN"
echo "Step 2: Obtain allocation tracker address"
ALLOCATION_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 src/AllocationIDTracker.sol:AllocationIDTracker --json --broadcast)
ALLOCATION_TRACKER_AD=$(echo $ALLOCATION_VAR | jq -r '.deployedTo')
echo "Allocation tracker address: $ALLOCATION_TRACKER_AD"

echo "Step 3: Obtain istaking address"
ISTAKING_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 test/MockStaking.sol:MockStaking --constructor-args $GRAPH_TOKEN --json --broadcast)
ISTAKING_AD=$(echo $ISTAKING_VAR | jq -r '.deployedTo')
echo "Istaking address: $ISTAKING_AD"

echo "Step 4: Obtain TAPVerifier address"
TAP_VERIFIER_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 src/TAPVerifier.sol:TAPVerifier --constructor-args 'tapVerifier' '1.0' --json --broadcast)
TAP_VERIFIER_AD=$(echo $TAP_VERIFIER_VAR | jq -r '.deployedTo')
echo "Tap verifier address: $TAP_VERIFIER_AD"

echo "Step 5: Obtain Escrow address"
ESCROW_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 src/Escrow.sol:Escrow --constructor-args $GRAPH_TOKEN $ISTAKING_AD $TAP_VERIFIER_AD $ALLOCATION_TRACKER_AD 10 15 --json --broadcast)
ESCROW_AD=$(echo $ESCROW_VAR | jq -r '.deployedTo')
echo "Escrow address: $ESCROW_AD"

cd $current_dir

echo "Deploying locally the subgraph"
yq ".dataSources[].source.address=\"$ESCROW_AD\"" ../subgraph.yaml -i
yarn codegen
yarn build
yarn create-local
yarn deploy-local

echo "Running escrow contract calls"
python local_contract_calls.py "$ESCROW_AD" "$TAP_VERIFIER_AD" "$GRAPH_TOKEN" "$ISTAKING_AD"