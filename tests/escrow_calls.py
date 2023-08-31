

from eip712_structs import make_domain
from web3 import Web3
from web3.exceptions import ContractCustomError, ContractLogicError
import json
from eth_account.messages import encode_defunct
import time
from helpers import ReceiptAggregateVoucher, decode_custom_error, obtain_final_signature
from helpers import GATEWAY, ALLOCATION_ID, ALLOCATIONID_PK, SIGNER, SIGNER_PK, RECEIVER, ESCROW_ADDRESS, TAP_ADDRESS

# This script will help test that the subgraph is actually catching the required information


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
#message_hash = Web3.solidity_keccak(['address', 'address', 'address'], [GATEWAY, ALLOCATION_ID, ESCROW_ADDRESS])
allocation_id_digest = encode_defunct(message_hash)
signature_proof = w3.eth.account.sign_message(allocation_id_digest, private_key=ALLOCATIONID_PK)
print("SIGNATURE PROOOF: ", signature_proof.signature.hex())

# RAV
rav = (ALLOCATION_ID, 1691694025, 5)
signedRAV = (rav, rav_signature)
print("RAV SIGNATURE", rav_signature.hex())
timer = int(time.time()) + 86400
#Authorization
hashed_data = Web3.solidity_keccak(['uint256', 'uint256', 'address'], [1337, timer, GATEWAY])
#bytes_sender = Web3.to_bytes(hexstr=GATEWAY)
#hashed_data = Web3.keccak(bytes_sender)
encode_data =encode_defunct(hashed_data)
signature_authorization = w3.eth.account.sign_message(encode_data, private_key=SIGNER_PK)

# Load abi to make calls to the Escrow contract
escrow_abi = open('../abis/Escrow.abi.json')
escrow_abi_json = json.load(escrow_abi)
escrow = w3.eth.contract(address=ESCROW_ADDRESS, abi=escrow_abi_json)

try:
    print("Starting with deposits")
    escrow.functions.deposit(RECEIVER, 15).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    escrow.functions.deposit(RECEIVER, 33).transact({"from":SIGNER, "to": ESCROW_ADDRESS})
    escrow.functions.deposit(SIGNER, 44).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    print("Start thawing")
    escrow.functions.thaw(SIGNER, 10).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    time.sleep(30)
    print("Trying to withdraw")
    escrow.functions.withdraw(SIGNER).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    print("Approving")
    escrow.functions.approveAll().transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
    print("Approving signer")
    escrow.functions.authorizeSigner(SIGNER, timer, signature_authorization.signature).transact({"from":GATEWAY, "to": ESCROW_ADDRESS})
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
