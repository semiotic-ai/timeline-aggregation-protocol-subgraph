import sys
import json
import time

from eip712.messages import EIP712Message
from web3 import Web3
from web3.exceptions import ContractCustomError, ContractLogicError
from eth_account.messages import encode_defunct
from eth_account.account import Account

from helpers import decode_custom_error, time_remaining
from helpers import GATEWAY, ALLOCATION_ID, ALLOCATIONID_PK, SIGNER, SIGNER_PK, RECEIVER

# This script will help test that the subgraph is actually catching the required information
ESCROW_ADDRESS = sys.argv[1]
TAP_ADDRESS = sys.argv[2]
GRAPH_TOKEN = sys.argv[3]

w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))

# The class name must be `ReceiptAggregateVoucher` for the EIP712Message to work
class ReceiptAggregateVoucher(EIP712Message):
    _chainId_ = 1337
    _verifyingContract_ = TAP_ADDRESS
    _version_ = "1.0"
    _name_ = "tapVerifier"

    allocationId: 'address'
    timestampNs: 'uint64'
    valueAggregate: 'uint128'

msg = ReceiptAggregateVoucher(allocationId=ALLOCATION_ID, timestampNs=1691694025, valueAggregate=5)

#EIP712
account = Account.from_key(SIGNER_PK)
rav_signature = account.sign_message(msg.signable_message).signature

# Normal proof
message_hash = Web3.solidity_keccak(['uint256', 'address', 'address', 'address'], [1337, GATEWAY, ALLOCATION_ID, ESCROW_ADDRESS])
allocation_id_digest = encode_defunct(message_hash)
signature_proof = w3.eth.account.sign_message(allocation_id_digest, private_key=ALLOCATIONID_PK)
#print("SIGNATURE PROOOF: ", signature_proof.signature.hex())

# RAV
rav = (ALLOCATION_ID, 1691694025, 5)
signedRAV = (rav, rav_signature)
#print("RAV SIGNATURE", rav_signature.hex())
timer = int(time.time()) + 86400

#Authorization
hashed_data = Web3.solidity_keccak(['uint256', 'uint256', 'address'], [1337, timer, GATEWAY])
encode_data =encode_defunct(hashed_data)
signature_authorization = w3.eth.account.sign_message(encode_data, private_key=SIGNER_PK)

# Load abi to make calls to the Escrow contract
escrow_abi = open('../abis/Escrow.abi.json')
escrow_abi_json = json.load(escrow_abi)
escrow = w3.eth.contract(address=ESCROW_ADDRESS, abi=escrow_abi_json)

erc20_abi = open('../abis/ERC20.abi.json')
erc20_abi_json = json.load(erc20_abi)
erc20 = w3.eth.contract(address=GRAPH_TOKEN, abi=erc20_abi_json)

try:
    print("Approving escrow contracts")
    erc20.functions.approve(ESCROW_ADDRESS, 10000).transact({"from":GATEWAY})
    erc20.functions.approve(ESCROW_ADDRESS, 10000).transact({"from":SIGNER})
    print("Making sure all addresses have available founds")
    erc20.functions.transfer(SIGNER, 500).transact({"from":GATEWAY})
    erc20.functions.transfer(RECEIVER, 500).transact({"from":GATEWAY})
except ContractCustomError as e:
    print ('Custom Error: %s' % e)
    print (decode_custom_error(erc20_abi_json,str(e),w3))
except ContractLogicError as e:
    print ('Logic Error: %s' % e)   

try:
    print("Starting with deposits")
    escrow.functions.deposit(RECEIVER, 15).transact({"from":GATEWAY})
    escrow.functions.deposit(RECEIVER, 33).transact({"from":SIGNER})
    escrow.functions.deposit(SIGNER, 44).transact({"from":GATEWAY})
    print("Start thawing")
    escrow.functions.thaw(SIGNER, 10).transact({"from":GATEWAY})
    thawing = True
    while(thawing):
        try:
            print("Trying to withdraw")
            escrow.functions.withdraw(SIGNER).transact({"from":GATEWAY})
            thawing = False
        except ContractCustomError as e:
            error = decode_custom_error(escrow_abi_json,str(e),w3)
            if("EscrowStillThawing" in error):
                time_left = time_remaining(error)
                print(f"Escrow still thawing, time left: {time_left}")
                time.sleep(time_left + 1)
    print("Approving")
    escrow.functions.approveAll().transact({"from":GATEWAY})
    print("Approving signer")
    try:
        escrow.functions.authorizeSigner(
            SIGNER, timer, signature_authorization.signature
        ).transact({"from":GATEWAY})
    except ContractCustomError as e:
        error = decode_custom_error(escrow_abi_json,str(e),w3)
        if("SignerAlreadyAuthorized" in error):
            print("Skip, signer already authorized")
        else:
            print(error)
    print("Executing deposit for redeem")
    escrow.functions.deposit(RECEIVER, 12).transact({"from":GATEWAY})
    print("Executing redeem")
    escrow.functions.redeem(signedRAV, signature_proof.signature).transact({"from":RECEIVER})
    print("Transactions ran succesfully")
except ContractCustomError as e:
    print ('Custom Error: %s' % e)
    print (decode_custom_error(escrow_abi_json,str(e),w3))
except ContractLogicError as e:
    print ('Logic Error: %s' % e)
