import json
import os
import sys
import time

from eip712.messages import EIP712Message
from eth_account.messages import encode_defunct
from web3 import Web3
from web3.exceptions import ContractCustomError, ContractLogicError

from helpers import (ALLOCATION_ID, ALLOCATIONID_PK, GATEWAY, RECEIVER, SIGNER,
                     SIGNER_PK, check_subgraph_escrow_account,
                     check_subgraph_signer, check_subgraph_transaction,
                     decode_custom_error, time_remaining)

# This script will help test that the subgraph is actually catching the required information
ESCROW_ADDRESS = sys.argv[1]
TAP_ADDRESS = sys.argv[2]
GRAPH_TOKEN = sys.argv[3]
STAKING_ADDRESS = sys.argv[4]
verified_transactions = []

w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))


class ReceiptAggregateVoucher(EIP712Message):
    _chainId_ = 1337
    _name_ = "tapVerifier"
    _verifyingContract_ = TAP_ADDRESS
    _version_ = "1.0"

    allocationId: "address"
    timestampNs: "uint64"
    valueAggregate: "uint128"


msg = ReceiptAggregateVoucher(
    allocationId=ALLOCATION_ID, timestampNs=1691694025, valueAggregate=5
)

# EIP712
rav_signature = w3.eth.account.sign_message(
    msg.signable_message, private_key=SIGNER_PK
).signature

# Normal proof
message_hash = Web3.solidity_keccak(
    ["uint256", "address", "address", "address"],
    [1337, GATEWAY, ALLOCATION_ID, ESCROW_ADDRESS],
)
allocation_id_digest = encode_defunct(message_hash)
signature_proof = w3.eth.account.sign_message(
    allocation_id_digest, private_key=ALLOCATIONID_PK
)
# print("SIGNATURE PROOOF: ", signature_proof.signature.hex())

# RAV
rav = (ALLOCATION_ID, 1691694025, 5)
signedRAV = (rav, rav_signature)
# print("RAV SIGNATURE", rav_signature.hex())
timer = int(time.time()) + 86400

# Authorization
hashed_data = Web3.solidity_keccak(
    ["uint256", "uint256", "address"], [1337, timer, GATEWAY]
)
encode_data = encode_defunct(hashed_data)
signature_authorization = w3.eth.account.sign_message(
    encode_data, private_key=SIGNER_PK
)

# Load abi to make calls to the Escrow contract
escrow_abi_json = json.load(open("../abis/Escrow.abi.json"))
escrow = w3.eth.contract(address=ESCROW_ADDRESS, abi=escrow_abi_json)

# Load MockStacking
mockStaking_abi_json = json.load(open("../abis/MockStaking.abi.json"))
mockStaking = w3.eth.contract(address=STAKING_ADDRESS, abi=mockStaking_abi_json)

# Load ERC20
erc20_abi_json = json.load(open("../abis/ERC20.abi.json"))
erc20 = w3.eth.contract(address=GRAPH_TOKEN, abi=erc20_abi_json)

# ERC20 CONTRACT CALLS
try:
    print("Approving escrow contracts")
    erc20.functions.approve(ESCROW_ADDRESS, 10000).transact({"from": GATEWAY})
    erc20.functions.approve(ESCROW_ADDRESS, 10000).transact({"from": SIGNER})
    print("Making sure all addresses have available founds")
    erc20.functions.transfer(SIGNER, 500).transact({"from": GATEWAY})
    erc20.functions.transfer(RECEIVER, 500).transact({"from": GATEWAY})
except ContractCustomError as e:
    raise ContractCustomError(decode_custom_error(erc20_abi_json, str(e), w3))
except ContractLogicError as e:
    raise ContractLogicError(f"Logic Error: {e}")

# MOCK STAKING CONTRACT CALLS
try:
    message_hash = Web3.solidity_keccak(
        ["address", "address"], [GATEWAY, ALLOCATION_ID]
    )

    # Convert the hash to the Ethereum specific signature format
    eth_signed_message = encode_defunct(hexstr=message_hash.hex())

    # Sign the message with the private key
    signature = w3.eth.account.sign_message(
        eth_signed_message, private_key=ALLOCATIONID_PK
    )
    arbitraryBytes32 = os.urandom(32)
    print("Allocate receiver with allocationid")
    mockStaking.functions.allocate(
        arbitraryBytes32, 1000, ALLOCATION_ID, arbitraryBytes32, RECEIVER
    ).transact({"from": RECEIVER})
except ContractCustomError as e:
    raise ContractCustomError(decode_custom_error(mockStaking_abi_json, str(e), w3))
except ContractLogicError as e:
    raise ContractLogicError(f"Logic Error: {e}")

# ESCROW CONTRACT CALLS
try:
    print("--- Starting with deposits")
    txn = escrow.functions.deposit(RECEIVER, 15).transact({"from": GATEWAY})
    print(f"Deposit txn hash: {txn.hex()}")
    check_subgraph_transaction(txn.hex(), GATEWAY, RECEIVER, "deposit", 15)
    check_subgraph_escrow_account(GATEWAY, RECEIVER, 0, 15)

    txn = escrow.functions.deposit(RECEIVER, 33).transact({"from": SIGNER})
    print(f"Deposit txn hash: {txn.hex()}")
    check_subgraph_transaction(txn.hex(), GATEWAY, RECEIVER, "deposit", 33)
    check_subgraph_escrow_account(SIGNER, RECEIVER, 0, 33)

    txn = escrow.functions.deposit(SIGNER, 44).transact({"from": GATEWAY})
    print(f"Deposit txn hash: {txn.hex()}")
    check_subgraph_transaction(txn.hex(), GATEWAY, RECEIVER, "deposit", 44)
    check_subgraph_escrow_account(GATEWAY, SIGNER, 0, 44)

    print("--- Start thawing")
    escrow.functions.thaw(SIGNER, 10).transact({"from": GATEWAY})
    check_subgraph_escrow_account(GATEWAY, SIGNER, 10, 44)

    print("--- Cancelling thaw")
    escrow.functions.thaw(SIGNER, 0).transact({"from": GATEWAY})
    check_subgraph_escrow_account(GATEWAY, SIGNER, 0, 44)

    print("--- Start thawing again")
    escrow.functions.thaw(SIGNER, 10).transact({"from": GATEWAY})
    check_subgraph_escrow_account(GATEWAY, SIGNER, 10, 44)

    thawing = True
    while thawing:
        try:
            print("--- Trying to withdraw")
            txn = escrow.functions.withdraw(SIGNER).transact({"from": GATEWAY})
            thawing = False
        except ContractCustomError as e:
            error = decode_custom_error(escrow_abi_json, str(e), w3)
            if "EscrowStillThawing" in error:
                time_left = time_remaining(error)
                print(f"Escrow still thawing, time left: {time_left}")
                time.sleep(time_left + 1)
    print(f"Withdraw txn hash: {txn.hex()}")
    print("--- Amount withdrawn")
    check_subgraph_transaction(txn.hex(), GATEWAY, RECEIVER, "withdraw", 10)
    check_subgraph_escrow_account(GATEWAY, SIGNER, 0, 34)

    print("--- Approving")
    escrow.functions.approveAll().transact({"from": GATEWAY})
    print("--- Approving signer")
    try:
        escrow.functions.authorizeSigner(
            SIGNER, timer, signature_authorization.signature
        ).transact({"from": GATEWAY})
    except ContractCustomError as e:
        error = decode_custom_error(escrow_abi_json, str(e), w3)
        if "SignerAlreadyAuthorized" in error:
            print("Skip, signer already authorized")
        else:
            raise ContractCustomError(error)
    check_subgraph_signer(SIGNER, True, False)

    print("--- Executing deposit for redeem")
    txn = escrow.functions.deposit(RECEIVER, 12).transact({"from": GATEWAY})
    print(f"Deposit txn hash: {txn.hex()}")
    check_subgraph_transaction(txn.hex(), GATEWAY, RECEIVER, "deposit", 12)
    check_subgraph_escrow_account(GATEWAY, RECEIVER, 0, 27)

    print("--- Executing redeem")
    txn = escrow.functions.redeem(signedRAV, signature_proof.signature).transact(
        {"from": RECEIVER}
    )
    print(f"Redeem txn hash: {txn.hex()}")
    check_subgraph_transaction(txn.hex(), GATEWAY, RECEIVER, "redeem", 5)
    check_subgraph_escrow_account(GATEWAY, RECEIVER, 0, 22)

    print("--- Thawing signer")
    escrow.functions.thawSigner(SIGNER).transact({"from": GATEWAY})
    check_subgraph_signer(SIGNER, True, True)

    print("--- Cancelling thaw signer")
    escrow.functions.cancelThawSigner(SIGNER).transact({"from": GATEWAY})
    check_subgraph_signer(SIGNER, True, False)

    print("--- Thawing signer again")
    escrow.functions.thawSigner(SIGNER).transact({"from": GATEWAY})
    check_subgraph_signer(SIGNER, True, True)

    thawing = True
    while thawing:
        try:
            print("--- Trying to revoke signer")
            escrow.functions.revokeAuthorizedSigner(SIGNER).transact({"from": GATEWAY})
            thawing = False
        except ContractCustomError as e:
            error = decode_custom_error(escrow_abi_json, str(e), w3)
            if "SignerStillThawing" in error:
                time_left = time_remaining(error)
                print(f"Signer still thawing, time left: {time_left}")
                time.sleep(time_left + 1)
            else:
                raise ContractCustomError(error)
    print("Done revoking")

    check_subgraph_signer(SIGNER, False, False)

    print("Transactions ran succesfully")
except ContractCustomError as e:
    raise ContractCustomError(decode_custom_error(escrow_abi_json, str(e), w3))
except ContractLogicError as e:
    raise ContractLogicError(f"Logic Error: {e}")
except Exception as e:
    raise Exception(e)
