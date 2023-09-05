

from eip712_structs import make_domain
from web3 import Web3
from web3.exceptions import ContractCustomError, ContractLogicError
import json
from eth_account.messages import encode_defunct
import time
from helpers import ReceiptAggregateVoucher, decode_custom_error, obtain_final_signature, time_remaining
from helpers import GATEWAY, ALLOCATION_ID, ALLOCATIONID_PK, SIGNER, SIGNER_PK, RECEIVER
import sys

# This script will help test that the subgraph is actually catching the required information
ESCROW_ADDRESS = sys.argv[1]
TAP_ADDRESS = sys.argv[2]
GRAPH_TOKEN = sys.argv[3]

my_domain = make_domain(name='tapVerifier',
    version='1.0',
    chainId=1337,
    verifyingContract=TAP_ADDRESS
)


w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))

#RAV
msg = ReceiptAggregateVoucher()
msg['allocationId'] = ALLOCATION_ID
msg['timestampNs'] = 1691694025
msg['valueAggregate'] = 5

#EIP712
signable_bytes = msg.signable_bytes(my_domain)
rav_digest = encode_defunct(signable_bytes)
rav_signature = obtain_final_signature(SIGNER_PK, signable_bytes)

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
    erc20.functions.approve(ESCROW_ADDRESS, 10000).transact({"from":GATEWAY, "to": GRAPH_TOKEN})
    erc20.functions.approve(ESCROW_ADDRESS, 10000).transact({"from":SIGNER, "to": GRAPH_TOKEN})
    print("Making sure all addresses have available founds")
    erc20.functions.transfer(SIGNER, 500).transact({"from":GATEWAY, "to": GRAPH_TOKEN})
    erc20.functions.transfer(RECEIVER, 500).transact({"from":GATEWAY, "to": GRAPH_TOKEN})
except ContractCustomError as e:
    print ('Custom Error: %s' % e)
    print (decode_custom_error(erc20_abi_json,str(e),w3))
except ContractLogicError as e:
    print ('Logic Error: %s' % e)   

try:
    print("Starting with deposits")
    escrow.functions.deposit(RECEIVER, 15).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    escrow.functions.deposit(RECEIVER, 33).transact({"from":SIGNER, "to": ESCROW_ADDRESS})
    escrow.functions.deposit(SIGNER, 44).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    print("Start thawing")
    escrow.functions.thaw(SIGNER, 10).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    thawing = True
    while(thawing):
        try:
            print("Trying to withdraw")
            escrow.functions.withdraw(SIGNER).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
            thawing = False
        except ContractCustomError as e:
            error = decode_custom_error(escrow_abi_json,str(e),w3)
            if("EscrowStillThawing" in error):
                time_left = time_remaining(error)
                print(f"Escrow still thawing, time left: {time_left}")
                time.sleep(time_left + 1)
    print("Approving")
    escrow.functions.approveAll().transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    print("Approving signer")
    try:
        escrow.functions.authorizeSigner(
            SIGNER, timer, signature_authorization.signature
        ).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    except ContractCustomError as e:
        error = decode_custom_error(escrow_abi_json,str(e),w3)
        if("SignerAlreadyAuthorized" in error):
            print("Skip, signer already authorized")
        else:
            print(error)
    print("Executing deposit for redeem")
    escrow.functions.deposit(RECEIVER, 12).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    print("Executing redeem")
    escrow.functions.redeem(signedRAV, signature_proof.signature).transact({"from":RECEIVER, "to": ESCROW_ADDRESS})
    print("Transactions ran succesfully")
except ContractCustomError as e:
    print ('Custom Error: %s' % e)
    print (decode_custom_error(escrow_abi_json,str(e),w3))
except ContractLogicError as e:
    print ('Logic Error: %s' % e)
