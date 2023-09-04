from eip712_structs import EIP712Struct, Address, Uint
from eth_utils import big_endian_to_int
from coincurve import PrivateKey
from eth_utils.abi import function_abi_to_4byte_selector, collapse_if_tuple
import sha3

#CHANGE THIS ADDRESS WITH THE DEPLOYED ONE
ESCROW_ADDRESS = '0x94dFeceb91678ec912ef8f14c72721c102ed2Df7'
TAP_ADDRESS = '0x995629b19667Ae71483DC812c1B5a35fCaaAF4B8'

GATEWAY = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1'
GATEWAY_PK = '4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d'

ALLOCATIONID_PK = 'ae9a2e131e9b359b198fa280de53ddbe2247730b881faae7af08e567e58915bd'
ALLOCATION_ID = '0x3fD652C93dFA333979ad762Cf581Df89BaBa6795'

SIGNER = '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0'
SIGNER_PK = '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1'
RECEIVER = '0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b'
RECEIVER_PK = '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c'


keccak_hash = lambda x : sha3.keccak_256(x).digest()

class ReceiptAggregateVoucher(EIP712Struct):
    allocationId = Address()
    timestampNs = Uint(64)
    valueAggregate = Uint(128)

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


def obtain_final_signature(private_key, signable_info):
    pk = PrivateKey.from_hex(private_key)
    signature = pk.sign_recoverable(signable_info, hasher=keccak_hash)
    v = signature[64] + 27
    r = big_endian_to_int(signature[0:32])
    s = big_endian_to_int(signature[32:64])
    final_sig = r.to_bytes(32, 'big') + s.to_bytes(32, 'big') + v.to_bytes(1, 'big')
    return final_sig
