import {
    PaymentCollected
} from "../generated/GraphPayments/GraphPayments"
/* eslint-disable prefer-const */
import { BigInt, Bytes } from '@graphprotocol/graph-ts'
import {
    Transaction,
    Payer,
    Receiver,
    EscrowAccount,
    Signer,
    Collector
} from '../generated/schema'
let ZERO_BI = BigInt.fromI32(0)
let ZERO_AD = Bytes.fromHexString('0x0000000000000000000000000000000000000000')

export function createOrLoadPayer(id: Bytes): Payer {
    let payer = Payer.load(id)
    if (payer == null) {
        payer = new Payer(id)
        payer.save()
    }
    return payer as Payer
}

export function createOrLoadReceiver(id: Bytes): Receiver {
    let receiver = Receiver.load(id)
    if (receiver == null) {
        receiver = new Receiver(id)
        receiver.save()
    }
    return receiver as Receiver
}

export function createOrLoadCollector(id: Bytes): Collector {
    let collector = Collector.load(id)
    if (collector == null) {
        collector = new Collector(id)
        collector.save()
    }
    return collector as Collector
}

export function createOrLoadSigner(id: Bytes): Signer {
    let signer = Signer.load(id)
    if (signer == null) {
        signer = new Signer(id)
        signer.isAuthorized = false
        signer.payer = ZERO_AD
        signer.thawEndTimestamp = ZERO_BI
        signer.save()
    }
    return signer as Signer
}

export function createOrLoadEscrowAccount(payer: Bytes, collector: Bytes, receiver: Bytes): EscrowAccount {
    let payer_collector_receiver = payer.concat(collector).concat(receiver)
    let escrowAccount = EscrowAccount.load(payer_collector_receiver)
    if (escrowAccount == null) {
        escrowAccount = new EscrowAccount(payer_collector_receiver)
        escrowAccount.balance = ZERO_BI
        escrowAccount.thawEndTimestamp = ZERO_BI
        escrowAccount.totalAmountThawing = ZERO_BI
        escrowAccount.payer = payer
        escrowAccount.receiver = receiver
        escrowAccount.collector = collector
        escrowAccount.save()
    }
    return escrowAccount as EscrowAccount
}
