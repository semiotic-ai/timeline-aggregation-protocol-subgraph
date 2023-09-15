from eth_utils.abi import function_abi_to_4byte_selector, collapse_if_tuple
import requests
import json
import time

GATEWAY = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1'
GATEWAY_PK = '4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d'

ALLOCATIONID_PK = 'ae9a2e131e9b359b198fa280de53ddbe2247730b881faae7af08e567e58915bd'
ALLOCATION_ID = '0x3fD652C93dFA333979ad762Cf581Df89BaBa6795'

SIGNER = '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0'
SIGNER_PK = '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1'
RECEIVER = '0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b'
RECEIVER_PK = '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c'

subgraph_endpoint = 'http://127.0.0.1:8000/subgraphs/name/semiotic/tap'

def time_remaining(error):
    timestamps = error.replace(')','').split('(')[1].split(',')
    time_a = int(timestamps[0])
    time_b = int(timestamps[1])
    time_left = time_b - time_a
    return time_left


def decode_custom_error(contract_abi, error_data, w3):
    for error in [abi for abi in contract_abi if abi["type"] == "error"]:
        name = error["name"]
        data_types = [collapse_if_tuple(abi_input) for abi_input in error.get("inputs", [])]
        error_signature_hex = function_abi_to_4byte_selector(error).hex()
        if error_signature_hex.casefold() == str(error_data)[2:10].casefold():
            params = ','.join([str(x) for x in w3.codec.decode(data_types,bytes.fromhex(str(error_data)[10:]))])
            decoded = "%s(%s)" % (name , str(params))
            return decoded
    return None


def check_subgraph_transaction(sender, receiver, type, verified_transactions, amount):
    time.sleep(3)
    graphql_query = """
        query($sender: String!, $receiver: String!, $type: String!){
            transactions(where: {sender: $sender, receiver: $receiver, type: $type}) {
                id
                type
                receiver {
                    id
                }
                sender {
                    id
                }
                amount
            }
        }
    """
    vars = {"sender": sender.lower(), "receiver": receiver.lower(), "type": type}
    request_data = {
        'query': graphql_query,
        'variables': vars
    }
    resp = requests.post(subgraph_endpoint, json=request_data)

    if resp.status_code == 200:
        data = json.loads(resp.text)["data"]["transactions"]
        print(data)
        subgraph_ok, verified_transactions = verify_data_in_subgraph_response(data, "amount", amount, verified_transactions)
        if not subgraph_ok:
            raise Exception(f"Subgraph expected info at amount incorrect")
        return verified_transactions
    else:
        raise Exception(f"Request failed with status code: {resp.status_code}")


def check_subgraph_escrow_account(sender, receiver, totalAmountThawing, balance):
    time.sleep(3)
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
    request_data = {
        'query': graphql_query,
        'variables': vars
    }
    resp = requests.post(subgraph_endpoint, json=request_data)

    if resp.status_code == 200:
        data = json.loads(resp.text)["data"]["escrowAccounts"]
        print(data)
        # verified transactions wont be saved for escrowAccounts since this id needs to be rechecked again
        subgraph_ok = verify_data_in_subgraph_response(data, "totalAmountThawing", totalAmountThawing, [])[0]
        if not subgraph_ok:
            raise Exception(f"Subgraph expected info at totalAmountThawing incorrect")
        subgraph_ok = verify_data_in_subgraph_response(data, "balance", balance, [])[0]
        if not subgraph_ok:
            raise Exception(f"Subgraph expected info at balance incorrect")
    else:
        raise Exception(f"Request failed with status code: {resp.status_code}")


def check_subgraph_signer(signer, authorized):
    time.sleep(5)
    graphql_query = """
        query($authorized_signer: String!){
            authorizedSigners(where :{id: $authorized_signer}) {
                is_authorized
            }
        }
    """
    vars = {"authorized_signer": signer.lower()}
    request_data = {
        'query': graphql_query,
        'variables': vars
    }
    resp = requests.post(subgraph_endpoint, json=request_data)

    if resp.status_code == 200:
        # Can only return one thing
        data = json.loads(resp.text)["data"]["authorizedSigners"]
        print(data)
        if data[0]["is_authorized"] != authorized:
            raise Exception(f"Subgraph expected info at is_authorized incorrect")
    else:
        raise Exception(f"Request failed with status code: {resp.status_code}")


def verify_data_in_subgraph_response(data, var_to_check, expected_value, verified_transactions):
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
