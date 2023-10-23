import json
import time

import backoff
import requests
from eth_utils.abi import collapse_if_tuple, function_abi_to_4byte_selector
from web3 import Web3

MAX_TRIES = 15
GATEWAY = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"
GATEWAY_PK = "4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"

ALLOCATIONID_PK = "ae9a2e131e9b359b198fa280de53ddbe2247730b881faae7af08e567e58915bd"
ALLOCATION_ID = "0x3fD652C93dFA333979ad762Cf581Df89BaBa6795"

SIGNER = "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0"
SIGNER_PK = "6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1"
RECEIVER = "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b"
RECEIVER_PK = "6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c"

subgraph_endpoint = "http://127.0.0.1:8000/subgraphs/name/semiotic/tap"

TEST_NET_VARS = {
    "arbitrum-goerli": {
        "subgraph-endpoint": "https://api.studio.thegraph.com/query/53925/arb-goerli-tap-subgraph/version/latest",
        "escrow": "0xE805CC3166fc0d03C15165303F5e54e1f57A1BCb",
        "tapVerifier": "0x112A1f7bEEf0F8bcA9b47d01db7926aB0F2A181e",
        "graphToken": "0x18C924BD5E8b83b47EFaDD632b7178E2Fd36073D",
        "staking": "0xcd549d0C43d915aEB21d3a331dEaB9B7aF186D26",
        "allocationIDTracker": "0x08779382cf862c88228F959b3D9140f35aDc28a4",
        "eth_rpc": "wss://arbitrum-goerli.publicnode.com",
        "chainID": 421613,
        "startBlock": 44335434,
        "ravName": "tapVerifier",
        "ravVersion": "1.0",
    },
    "eth-goerli": {
        "subgraph-endpoint": "https://api.studio.thegraph.com/query/53925/eth-goerli-tap-subgraph/version/latest",
        "escrow": "0xD46c60558F7960407F4D00098145D77Fd061aD90",
        "tapVerifier": "0x4178395AfE4F339E5FA91076542e24187dbA121a",
        "graphToken": "0x5c946740441C12510a167B447B7dE565C20b9E3C",
        "staking": "0x35e3Cb6B317690d662160d5d02A5b364578F62c9",
        "allocationIDTracker": "0xA65C99688a28bf91b59078298A6F5130c8aEf800",
        "eth_rpc": "wss://ethereum-goerli.publicnode.com",
        "chainID": 5,
        "startBlock": 9765075,
        "ravName": "TAP",
        "ravVersion": "1",
    },
}


def time_remaining(error):
    timestamps = error.replace(")", "").split("(")[1].split(",")
    time_a = int(timestamps[0])
    time_b = int(timestamps[1])
    time_left = time_b - time_a
    return time_left


def decode_custom_error(contract_abi, error_data, w3):
    for error in [abi for abi in contract_abi if abi["type"] == "error"]:
        name = error["name"]
        data_types = [
            collapse_if_tuple(abi_input) for abi_input in error.get("inputs", [])
        ]
        error_signature_hex = function_abi_to_4byte_selector(error).hex()
        if error_signature_hex.casefold() == str(error_data)[2:10].casefold():
            params = ",".join(
                [
                    str(x)
                    for x in w3.codec.decode(
                        data_types, bytes.fromhex(str(error_data)[10:])
                    )
                ]
            )
            decoded = f"{name} ({str(params)})"
            return decoded
    return None


def init_nonce(gateway, indexer, signer, receiver, w3):
    nonce_data = {
        gateway: w3.eth.get_transaction_count(gateway) - 1,
        indexer: w3.eth.get_transaction_count(indexer) - 1,
        signer: w3.eth.get_transaction_count(signer) - 1,
        receiver: w3.eth.get_transaction_count(receiver) - 1,
    }
    return nonce_data


def increment_nonce(address, nonce_data):
    nonce_data[address] += 1
    return nonce_data


@backoff.on_exception(backoff.expo, Exception, max_tries=MAX_TRIES)
def obtain_subgraph_info_backoff(endpoint, request_data, entity_to_check):
    print(f"Checking subgraph data for {entity_to_check}")
    resp = requests.post(endpoint, json=request_data)
    if resp.status_code == 200:
        print(resp.text)
        data = json.loads(resp.text)["data"][entity_to_check]
        if len(data) != 0:
            print(resp.text)
            return resp
    else:
        print(f"Error in response {resp}")
    raise Exception(f"No data returned from subgraph")


def check_subgraph_transaction(
    id, sender, receiver, type, amount, endpoint=subgraph_endpoint
):
    graphql_query = """
        query($id: String!){
            transactions(where: {id: $id}) {
                amount
            }
        }
    """
    vars = {"id": id.lower()}
    request_data = {"query": graphql_query, "variables": vars}
    resp = obtain_subgraph_info_backoff(endpoint, request_data, "transactions")
    print(f" ==== Subgraph response ==== \n {resp.text}")

    data = json.loads(resp.text)["data"]["transactions"][0]
    print(data)
    sg_amount = str(data["amount"])
    if sg_amount != str(amount):
        raise Exception(f"Subgraph expected info at amount incorrect")


@backoff.on_exception(backoff.expo, Exception, max_tries=MAX_TRIES)
def check_subgraph_escrow_account(
    sender, receiver, total_amount_thawing, balance, endpoint=subgraph_endpoint
):
    graphql_query = """
        query($id: String!){
            escrowAccounts(where:{id: $id}){
                id
                thawEndTimestamp
                totalAmountThawing
                balance
            }
        }
    """
    vars = {"id": sender.lower() + "-" + receiver.lower()}
    request_data = {"query": graphql_query, "variables": vars}
    resp = obtain_subgraph_info_backoff(endpoint, request_data, "escrowAccounts")
    print(f" ==== Subgraph response ==== \n {resp.text}")

    data = json.loads(resp.text)["data"]["escrowAccounts"]
    print(data)
    # verified transactions wont be saved for escrowAccounts since this id needs to be rechecked again
    subgraph_ok = verify_data_in_subgraph_response(
        data, "totalAmountThawing", total_amount_thawing, []
    )[0]
    if not subgraph_ok:
        raise Exception(f"Subgraph expected info at totalAmountThawing incorrect")
    subgraph_ok = verify_data_in_subgraph_response(data, "balance", balance, [])[0]
    if not subgraph_ok:
        raise Exception(f"Subgraph expected info at balance incorrect")


def error_in_signer_data(signer_data, thawing, authorized):

    error = True
    thaw_time_stamp = int(signer_data["thawEndTimestamp"])

    if signer_data["isAuthorized"] is authorized:
        error = False
    if thawing and thaw_time_stamp != 0:
        error = False
    if not thawing and thaw_time_stamp == 0:
        error = False
    return error


@backoff.on_exception(backoff.expo, Exception, max_tries=MAX_TRIES)
def check_subgraph_signer(
    signer, authorized, is_thawing, endpoint=subgraph_endpoint, test_net=False
):
    graphql_query = """
        query($authorized_signer: String!){
            authorizedSigners(where :{id: $authorized_signer}) {
                isAuthorized
                thawEndTimestamp
            }
        }
    """
    vars = {"authorized_signer": signer.lower()}
    request_data = {"query": graphql_query, "variables": vars}
    resp = obtain_subgraph_info_backoff(endpoint, request_data, "authorizedSigners")
    print(f" ==== Subgraph response ==== \n {resp.text}")
    data = json.loads(resp.text)["data"]["authorizedSigners"]
    print(data)
    print("Verifying data has been updated")
    error = error_in_signer_data(data[0], is_thawing, authorized)
    if error:
        raise Exception("Data in signer doesnt match expected value")


def check_deployed_subgraph_transaction(
    id, receiver, sender, amount, type, endpoint=subgraph_endpoint
):
    graphql_query = """
        query($id: String!, $sender: String!, $receiver: String!, $type: String!){
            transactions(where: {id: $id, sender: $sender, receiver: $receiver, type: $type}) {
                amount
            }
        }
    """
    vars = {
        "id": id.lower(),
        "sender": sender.lower(),
        "receiver": receiver.lower(),
        "type": type,
    }
    request_data = {"query": graphql_query, "variables": vars}
    resp = obtain_subgraph_info_backoff(endpoint, request_data, "transactions")
    print(f" ==== Subgraph response ==== \n {resp.text}")

    data = json.loads(resp.text)["data"]["transactions"][0]
    print(data)
    sg_amount = str(data["amount"])
    if sg_amount != str(amount):
        raise Exception(f"Subgraph expected info at amount incorrect")


def verify_data_in_subgraph_response(
    data, var_to_check, expected_value, verified_transactions
):
    # This will be called each time a transaction is called so there shouldnt be more than 1 result in data
    # that could be outside of verified_transactions
    for resp in data:
        id = resp["id"]
        extracted_data_to_check = resp[var_to_check]
        if id not in verified_transactions:
            verified_transactions.append(resp["id"])
            if str(extracted_data_to_check) == str(expected_value):
                return True, verified_transactions
    return False, verified_transactions
