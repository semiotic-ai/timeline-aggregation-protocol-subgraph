import json
import os
import random
import sys
import time

import backoff
from eip712.messages import EIP712Message
from eth_account.messages import encode_defunct
from web3 import Web3
from web3.exceptions import ContractCustomError, ContractLogicError

from helpers import (TEST_NET_VARS, add_nonce,
                     check_deployed_subgraph_transaction,
                     check_subgraph_signer, init_nonce)

testnet = sys.argv[1]

w3 = Web3(Web3.WebsocketProvider(TEST_NET_VARS[testnet]["eth_rpc"]))
w3.eth.account.enable_unaudited_hdwallet_features()

AMOUNT_TO_REDEEM = 5
SUBGRAPH_ENDPOINT = TEST_NET_VARS[testnet]["subgraph-endpoint"]
STAKING_ADDRESS = Web3.to_checksum_address(TEST_NET_VARS[testnet]["staking"])
GRAPH_TOKEN_ADDRESS = Web3.to_checksum_address(TEST_NET_VARS[testnet]["graphToken"])
ESCROW_ADDRESS = Web3.to_checksum_address(TEST_NET_VARS[testnet]["escrow"])
TAP_ADDRESS = Web3.to_checksum_address(TEST_NET_VARS[testnet]["tapVerifier"])
ALLOCATION_ID_TRACKER_ADDRESS = Web3.to_checksum_address(
    TEST_NET_VARS[testnet]["allocationIDTracker"]
)
CHAIN_ID = TEST_NET_VARS[testnet]["chainID"]

INDEXER_MNEMONIC = sys.argv[2]

TAP_DEPLOYER_ACCOUNT = w3.eth.account.from_mnemonic(
    INDEXER_MNEMONIC, account_path="m/44'/60'/0'/0/1"
)
INDEXER_ACCOUNT = w3.eth.account.from_mnemonic(
    INDEXER_MNEMONIC, account_path="m/44'/60'/0'/0/0"
)
print(f"Indexer {INDEXER_ACCOUNT.address}")

allocation_i = random.randint(50, 3550000)
ALLOCATIONID_ACCOUNT = w3.eth.account.from_mnemonic(
    INDEXER_MNEMONIC, account_path="m/44'/60'/0'/0/" + str(allocation_i)
)
print(f"allocation id {ALLOCATIONID_ACCOUNT.address}")

GATEWAY_ACCOUNT = w3.eth.account.from_mnemonic(
    INDEXER_MNEMONIC, account_path="m/44'/60'/0'/0/4"
)
print(f"Gateway {GATEWAY_ACCOUNT.address}")

SIGNER_ACCOUNT = w3.eth.account.from_mnemonic(
    INDEXER_MNEMONIC, account_path="m/44'/60'/0'/0/15"
)
print(f"signer  {SIGNER_ACCOUNT.address}")

RECEIVER_ACCOUNT = w3.eth.account.from_mnemonic(
    INDEXER_MNEMONIC, account_path="m/44'/60'/0'/0/6"
)
print(f"receiver  {RECEIVER_ACCOUNT.address}")

# Load abi to make calls to the Escrow contract
escrow_abi_json = json.load(open("../abis/Escrow.abi.json"))
escrow_contract = w3.eth.contract(address=ESCROW_ADDRESS, abi=escrow_abi_json)
# Load MockStaking
mock_staking_abi_json = json.load(open("../abis/Staking.abi.json"))
mock_staking_contract = w3.eth.contract(
    address=STAKING_ADDRESS, abi=mock_staking_abi_json
)
# Load ERC20
erc20_abi_json = json.load(open("../abis/ERC20.abi.json"))
erc20_contract = w3.eth.contract(address=GRAPH_TOKEN_ADDRESS, abi=erc20_abi_json)

indexer_account_nonce = w3.eth.get_transaction_count(INDEXER_ACCOUNT.address)


class ReceiptAggregateVoucher(EIP712Message):
    _chainId_ = CHAIN_ID
    _name_ = TEST_NET_VARS[testnet]["ravName"]
    _verifyingContract_ = TAP_ADDRESS
    _version_ = TEST_NET_VARS[testnet]["ravVersion"]

    allocationId: "address"
    timestampNs: "uint64"
    valueAggregate: "uint128"


def create_allocation(allocation_account, indexer_account, nonce_data):
    # Create a keccak256 hash of the receiver and allocationID
    message_hash = Web3.solidity_keccak(
        ["address", "address"], [indexer_account.address, allocation_account.address]
    )

    # Convert the hash to the Ethereum specific signature format
    eth_signed_message = encode_defunct(hexstr=message_hash.hex())

    # Sign the message with the private key
    signature = allocation_account.sign_message(eth_signed_message)

    print("Broadcasting allocation")
    nonce_data = add_nonce(indexer_account.address, nonce_data)
    # create random bytes32 for metadata and subgraphDeploymentID
    arbitraryBytes32 = os.urandom(32)
    allocate_txn = mock_staking_contract.functions.allocate(
        arbitraryBytes32,
        1000,
        allocation_account.address,
        arbitraryBytes32,
        signature.signature.hex(),
    ).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 3550000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[indexer_account.address],
        }
    )

    # Send escrow deposit
    print(
        "txn hash create allocation: ",
        sign_and_send_tx(indexer_account, allocate_txn).hex(),
    )


def sign_and_send_tx(account, transaction):
    """
    Sign a transaction using the given account and send it.
    Returns the transaction hash.
    """
    # Sign the transaction
    signed_txn = account.signTransaction(transaction)

    # Send the transaction
    return w3.eth.send_raw_transaction(signed_txn.rawTransaction)


@backoff.on_exception(backoff.expo, ValueError, max_tries=10)
def deposit_to_escrow(sender_account, receiver, amount, nonce_data):
    nonce_data = add_nonce(sender_account.address, nonce_data)
    # Prepare the transaction for ERC20 approval
    approve_txn = erc20_contract.functions.approve(
        ESCROW_ADDRESS, amount
    ).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 550000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[sender_account.address],
        }
    )

    # Send ERC20 approval
    print(
        "txn hash aprove: ", sign_and_send_tx(sender_account, approve_txn).hex()
    )

    nonce_data = add_nonce(sender_account.address, nonce_data)
    deposit_txn = escrow_contract.functions.deposit(receiver, amount).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 550000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[sender_account.address],
        }
    )

    print("Trying to run deposit")
    deposit_txn = sign_and_send_tx(sender_account, deposit_txn).hex()

    print("txn hash deposit: ", deposit_txn)
    check_deployed_subgraph_transaction(
        id=deposit_txn,
        receiver=receiver,
        sender=sender_account.address,
        amount=amount,
        type="deposit",
        endpoint=SUBGRAPH_ENDPOINT,
    )


def thaw(sender_account, receiver, amount, nonce_data):

    nonce_data = add_nonce(sender_account.address, nonce_data)
    thaw_txn = escrow_contract.functions.thaw(receiver, amount).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 550000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[sender_account.address],
        }
    )

    # Send escrow thaw
    print("txn hash thaw: ", sign_and_send_tx(sender_account, thaw_txn).hex())


@backoff.on_exception(backoff.expo, ValueError, max_tries=10)
def thaw_signer(sender_account, signer, nonce_data):

    nonce_data = add_nonce(sender_account.address, nonce_data)
    thaw_txn = escrow_contract.functions.thawSigner(signer).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 550000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[sender_account.address],
        }
    )

    print("Trying to thaw signer")
    thaw_txn = sign_and_send_tx(sender_account, thaw_txn).hex()

    print("txn hash thaw Signer: ", thaw_txn)
    check_subgraph_signer(
        signer=SIGNER_ACCOUNT.address,
        authorized=True,
        is_thawing=True,
        endpoint=SUBGRAPH_ENDPOINT,
        test_net=True,
    )


def withdraw(sender_account, receiver, nonce_data):

    nonce_data = add_nonce(sender_account.address, nonce_data)
    withdraw_txn = escrow_contract.functions.withdraw(receiver).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 550000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[sender_account.address],
        }
    )

    # Send escrow withdraw
    withdraw_txn = sign_and_send_tx(sender_account, withdraw_txn).hex()
    print("txn hash withdraw: ", withdraw_txn)
    check_deployed_subgraph_transaction(
        id=withdraw_txn,
        receiver=receiver,
        sender=sender_account.address,
        amount=10,
        type="withdraw",
        endpoint=SUBGRAPH_ENDPOINT,
    )


def authorize_signer(sender_account, signer, nonce_data, time_delta=86000):
    timestamp = w3.eth.get_block("latest")["timestamp"] + time_delta
    hashed_data = Web3.solidity_keccak(
        ["uint256", "uint256", "address"],
        [CHAIN_ID, timestamp, GATEWAY_ACCOUNT.address],
    )
    encode_data = encode_defunct(hashed_data)
    print(f"Gateway: {GATEWAY_ACCOUNT.address}")
    print(f"Encoded data {encode_data}")
    signature_authorization = w3.eth.account.sign_message(
        encode_data, private_key=SIGNER_ACCOUNT.key
    )

    nonce_data = add_nonce(sender_account.address, nonce_data)
    # Prepare the transaction for escrow deposit
    authorize_transaction = escrow_contract.functions.authorizeSigner(
        signer, timestamp, signature_authorization.signature
    ).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 550000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[sender_account.address],
        }
    )
    print(
        "txn hash authorize signer: ",
        sign_and_send_tx(sender_account, authorize_transaction).hex(),
    )
    check_subgraph_signer(
        signer=SIGNER_ACCOUNT.address,
        authorized=True,
        is_thawing=False,
        endpoint=SUBGRAPH_ENDPOINT,
        test_net=True,
    )


def unauthorize_signer(sender_account, signer, nonce_data, time_delta=86000):
    timestamp = w3.eth.get_block("latest")["timestamp"] + time_delta
    hashed_data = Web3.solidity_keccak(
        ["uint256", "uint256", "address"],
        [CHAIN_ID, timestamp, GATEWAY_ACCOUNT.address],
    )
    encode_data = encode_defunct(hashed_data)
    print(f"Gateway: {GATEWAY_ACCOUNT.address}")
    print(f"Encoded data {encode_data}")
    signature_authorization = w3.eth.account.sign_message(
        encode_data, private_key=SIGNER_ACCOUNT.key
    )

    nonce_data = add_nonce(sender_account.address, nonce_data)
    authorize_transaction = escrow_contract.functions.revokeAuthorizedSigner(
        signer
    ).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 550000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[sender_account.address],
        }
    )
    print(
        "txn hash authorize signer: ",
        sign_and_send_tx(sender_account, authorize_transaction).hex(),
    )
    check_subgraph_signer(
        signer=SIGNER_ACCOUNT.address,
        authorized=False,
        is_thawing=False,
        endpoint=SUBGRAPH_ENDPOINT,
        test_net=True,
    )


def redeem_signed_rav(
    rav: ReceiptAggregateVoucher, rav_signature, receiver_account, nonce_data
):
    message_hash = Web3.solidity_keccak(
        ["uint256", "address", "address", "address"],
        [
            CHAIN_ID,
            GATEWAY_ACCOUNT.address,
            ALLOCATIONID_ACCOUNT.address,
            ESCROW_ADDRESS,
        ],
    )
    allocation_id_digest = encode_defunct(message_hash)
    signature_proof = w3.eth.account.sign_message(
        allocation_id_digest, private_key=ALLOCATIONID_ACCOUNT.key
    )

    nonce_data = add_nonce(receiver_account.address, nonce_data)
    redeem_transaction = escrow_contract.functions.redeem(
        ((rav.allocationId, rav.timestampNs, rav.valueAggregate), rav_signature),
        signature_proof.signature,
    ).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 400000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[receiver_account.address],
        }
    )

    redeem_txn = sign_and_send_tx(receiver_account, redeem_transaction).hex()
    print("txn hash reedeem signed rav: ", redeem_txn)

    check_deployed_subgraph_transaction(
        id=redeem_txn,
        receiver=receiver_account.address,
        sender=GATEWAY_ACCOUNT.address,
        amount=AMOUNT_TO_REDEEM,
        type="redeem",
        endpoint=SUBGRAPH_ENDPOINT,
    )


@backoff.on_exception(backoff.expo, ValueError, max_tries=10)
def cancel_thaw(sender_account, receiver, nonce_data):
    nonce_data = add_nonce(sender_account.address, nonce_data)
    thaw_txn = escrow_contract.functions.thaw(receiver, 0).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 550000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[sender_account.address],
        }
    )

    print("Trying to cancel thaw")
    thaw_txn = sign_and_send_tx(sender_account, thaw_txn).hex()

    print("txn hash Cancel thaw: ", thaw_txn)


@backoff.on_exception(backoff.expo, ValueError, max_tries=10)
def cancel_thaw_signer(sender_account, signer, nonce_data):
    nonce_data = add_nonce(sender_account.address, nonce_data)
    thaw_txn = escrow_contract.functions.cancelThawSigner(signer).build_transaction(
        {
            "chainId": CHAIN_ID,
            "gas": 550000,  # you might want to adjust this value based on the real gas consumption
            "gasPrice": w3.to_wei("20", "gwei"),
            "nonce": nonce_data[sender_account.address],
        }
    )

    print("Trying to cancel thaw")
    thaw_txn = sign_and_send_tx(sender_account, thaw_txn).hex()

    print("txn hash Cancel thaw Signer: ", thaw_txn)
    check_subgraph_signer(
        signer=SIGNER_ACCOUNT.address,
        authorized=True,
        is_thawing=False,
        endpoint=SUBGRAPH_ENDPOINT,
        test_net=True,
    )


nonce_data = init_nonce(
    GATEWAY_ACCOUNT.address,
    INDEXER_ACCOUNT.address,
    SIGNER_ACCOUNT.address,
    RECEIVER_ACCOUNT.address,
    w3,
)
create_allocation(ALLOCATIONID_ACCOUNT, INDEXER_ACCOUNT, nonce_data)
deposit_to_escrow(GATEWAY_ACCOUNT, INDEXER_ACCOUNT.address, 100, nonce_data)
authorize_signer(GATEWAY_ACCOUNT, SIGNER_ACCOUNT.address, nonce_data, 86000)


msg = ReceiptAggregateVoucher(
    allocationId=ALLOCATIONID_ACCOUNT.address,
    timestampNs=1691694025,
    valueAggregate=AMOUNT_TO_REDEEM,
)
rav_signature = w3.eth.account.sign_message(
    msg.signable_message, private_key=SIGNER_ACCOUNT.key
).signature

redeem_signed_rav(msg, rav_signature, INDEXER_ACCOUNT, nonce_data)

print("Thawing escrow account")
thaw(GATEWAY_ACCOUNT, INDEXER_ACCOUNT.address, 10, nonce_data)
print("Thawing signer")
thaw_signer(GATEWAY_ACCOUNT, SIGNER_ACCOUNT.address, nonce_data)
print("Cancelling escrow account thawing")
cancel_thaw(GATEWAY_ACCOUNT, INDEXER_ACCOUNT.address, nonce_data)

print("Canel the Thawing of a signer")
cancel_thaw_signer(GATEWAY_ACCOUNT, SIGNER_ACCOUNT.address, nonce_data)
# withdraw(GATEWAY_ACCOUNT, INDEXER_ACCOUNT.address, nonce_data)
# unauthorize_signer(GATEWAY_ACCOUNT, SIGNER_ACCOUNT.address, nonce_data, 86000)
