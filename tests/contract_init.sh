#!/bin/bash
set -e

GATEWAY=0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1
SIGNER=0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0
RECEIVER=0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b

# Obtain curren dir
current_dir=$(pwd)

echo "Step 1: Run graph contracts"
cd $current_dir/contracts
pnpm install
echo "Building workspace packages"
pnpm -r --filter="!@graphprotocol/token-distribution" run build

cd $current_dir/timeline-aggregation-protocol-contracts
echo "Step 1.5: Deploy local GraphToken"
GRAPH_TOKEN_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 --broadcast test/MockERC20Token.sol:MockERC20Token --constructor-args 1000000000000000000000000000 2>&1)
GRAPH_TOKEN=$(echo "$GRAPH_TOKEN_VAR" | grep "Deployed to:" | awk '{print $3}')
echo "Graph token address: $GRAPH_TOKEN"

echo "Step 2: Obtain allocation tracker address"
ALLOCATION_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 --broadcast src/AllocationIDTracker.sol:AllocationIDTracker --json)
ALLOCATION_TRACKER_AD=$(echo $ALLOCATION_VAR | jq -r '.deployedTo')
echo "Allocation tracker address: $ALLOCATION_TRACKER_AD"

echo "Step 3: Obtain istaking address"
echo "Deploying MockStaking with GRAPH_TOKEN: $GRAPH_TOKEN"
ISTAKING_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 --broadcast test/MockStaking.sol:MockStaking --constructor-args $GRAPH_TOKEN 2>&1)
echo "Raw forge output: $ISTAKING_VAR"
ISTAKING_AD=$(echo "$ISTAKING_VAR" | grep "Deployed to:" | awk '{print $3}')
echo "Istaking address: $ISTAKING_AD"

echo "Step 4: Obtain TAPVerifier address"
TAP_VERIFIER_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 --broadcast src/TAPVerifier.sol:TAPVerifier --constructor-args 'tapVerifier' '1.0' 2>&1)
TAP_VERIFIER_AD=$(echo "$TAP_VERIFIER_VAR" | grep "Deployed to:" | awk '{print $3}')
echo "Tap verifier address: $TAP_VERIFIER_AD"

echo "Step 5: Obtain Escrow address"
ESCROW_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 --broadcast src/Escrow.sol:Escrow --constructor-args $GRAPH_TOKEN $ISTAKING_AD $TAP_VERIFIER_AD $ALLOCATION_TRACKER_AD 10 15 2>&1)
ESCROW_AD=$(echo "$ESCROW_VAR" | grep "Deployed to:" | awk '{print $3}')
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