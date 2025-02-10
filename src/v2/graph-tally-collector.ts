import {
    SignerAuthorized,
    SignerRevoked,
    SignerThawCanceled,
    SignerThawing,
    PaymentCollected,
    RAVCollected,
} from "../../generated/TapCollector/TapCollector"
/* eslint-disable prefer-const */
import { BigInt, Address } from '@graphprotocol/graph-ts'
import { createOrLoadEscrowAccount, createOrLoadPayer, createOrLoadReceiver, createOrLoadSigner, createOrLoadDataService, createOrLoadLatestRav } from "./graph-tally-utils"
let ZERO_BI = BigInt.fromI32(0)

const GRAPH_TALLY_COLLECTOR = Address.fromString("0x00000000000000000000000000")
export function handleSignerAuthorized(event: SignerAuthorized): void {
    let signer = createOrLoadSigner(event.params.authorizedSigner)
    signer.isAuthorized = true
    signer.payer = event.params.payer
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function handleSignerRevoked(event: SignerRevoked): void {
    let signer = createOrLoadSigner(event.params.authorizedSigner)
    signer.isAuthorized = false
    signer.payer = event.params.payer
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function handleSignerThawing(event: SignerThawCanceled): void {
    let signer = createOrLoadSigner(event.params.authorizedSigner)
    signer.payer = event.params.payer
    signer.isAuthorized = true
    signer.thawEndTimestamp = event.params.thawEndTimestamp
    signer.save()
}

export function handleSignerThawCanceled(event: SignerThawing): void {
    let signer = createOrLoadSigner(event.params.authorizedSigner)
    signer.payer = event.params.payer
    signer.isAuthorized = true
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function handlePaymentCollected(event: PaymentCollected): void {
    createOrLoadPayer(event.params.payer)
    createOrLoadReceiver(event.params.receiver)
    let escrow = createOrLoadEscrowAccount(event.params.payer, GRAPH_TALLY_COLLECTOR, event.params.receiver)
    let total_tokens_collected = escrow.balance.minus(event.params.tokensDataService).minus(event.params.tokensReceiver)
    escrow.balance = total_tokens_collected
    escrow.save()
}

export function handleRAVCollected(event: RAVCollected): void {

    createOrLoadPayer(event.params.payer)
    createOrLoadReceiver(event.params.serviceProvider)
    createOrLoadDataService(event.params.dataService)
    let latestRav = createOrLoadLatestRav(event.params.payer, event.params.dataService, event.params.serviceProvider)

    latestRav.valueAggregate = latestRav.valueAggregate.plus(event.params.valueAggregate)
    latestRav.timestamp = event.params.timestampNs
    latestRav.metadata = event.params.metadata
    latestRav.signature = event.params.signature

    latestRav.save()
}