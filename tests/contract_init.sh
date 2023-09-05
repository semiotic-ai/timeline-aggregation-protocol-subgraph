#!/bin/bash

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
echo "GRAPH TOKEN = $GRAPH_TOKEN"

command cd $current_dir/timeline-aggregation-protocol-contracts
command yarn
command forge install
command forge update
echo "Step 2: Obtain allocation tracker address"
ALLOCATION_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 src/AllocationIDTracker.sol:AllocationIDTracker --json)
ALLOCATION_TRACKER_AD=$(echo $ALLOCATION_VAR | jq -r '.deployedTo')
echo "Allocation tracker address: $ALLOCATION_TRACKER_AD"

echo "Step 3: Obtain istaking address"
ISTAKING_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 test/MockStaking.sol:MockStaking --constructor-args $GRAPH_TOKEN --json)
ISTAKING_AD=$(echo $ISTAKING_VAR | jq -r '.deployedTo')
echo "Istaking address: $ISTAKING_AD"

echo "Step 4: Obtain TAPVerifier address"
TAP_VERIFIER_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 src/TAPVerifier.sol:TAPVerifier --constructor-args 'tapVerifier' '1.0' --json)
TAP_VERIFIER_AD=$(echo $TAP_VERIFIER_VAR | jq -r '.deployedTo')
echo "Tap verifier address: $TAP_VERIFIER_AD"

echo "Step 5: Obtain Escrow address"
ESCROW_VAR=$(forge create --unlocked --from $GATEWAY --rpc-url localhost:8545 src/Escrow.sol:Escrow --constructor-args $GRAPH_TOKEN $ISTAKING_AD $TAP_VERIFIER_AD $ALLOCATION_TRACKER_AD 10 15 --json)
ESCROW_AD=$(echo $ESCROW_VAR | jq -r '.deployedTo')
echo "Escrow address: $ESCROW_AD"

echo "Approving escrow contract"
cast send --unlocked --from $GATEWAY $GRAPH_TOKEN 'approve(address spender, uint256 amount)' $ESCROW_AD '10000'
cast send --unlocked --from $SIGNER $GRAPH_TOKEN 'approve(address spender, uint256 amount)' $ESCROW_AD '10000'
cast send --unlocked --from $GATEWAY $GRAPH_TOKEN 'setAssetHolder(address, bool)' $ESCROW_AD true
# Making sure other accounts have money
cast send --unlocked --from $GATEWAY $GRAPH_TOKEN 'transfer(address to, uint256 amount)' $SIGNER 500
cast send --unlocked --from $GATEWAY $GRAPH_TOKEN 'transfer(address to, uint256 amount)' $RECEIVER 500
echo "Run commands to deploy subgraph, make sure to use the Escrow Address $ESCROW_AD in the subgraph.yaml"
echo "Inside /tests/utils.py change ESCROW_CONTRACT with $ESCROW_AD"

cd $current_dir

echo "Running escrow contract calls"
python escrow_calls.py "$ESCROW_AD" "$TAP_VERIFIER_AD"

