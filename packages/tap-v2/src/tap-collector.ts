import {
  SignerAuthorized,
  SignerRevoked,
  SignerThawCanceled,
  SignerThawing,
  PaymentCollected
} from "../generated/TapCollector/TapCollector"
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

export function handleSignerAuthorization(event: SignerAuthorized): void {
  let signer = createOrLoadSigner(event.params.authorizedSigner)
  signer.isAuthorized = true
  signer.payer = event.params.payer
  signer.thawEndTimestamp = ZERO_BI
  signer.save()
}

export function handleRevokeSignerAuthorization(event: SignerRevoked): void {
  let signer = createOrLoadSigner(event.params.authorizedSigner)
  signer.isAuthorized = false
  signer.payer = event.params.payer
  signer.thawEndTimestamp = ZERO_BI
  signer.save()
}

export function handleThawSigner(event: SignerThawCanceled): void {
  let signer = createOrLoadSigner(event.params.authorizedSigner)
  signer.payer = event.params.payer
  signer.isAuthorized = true
  signer.thawEndTimestamp = event.params.thawEndTimestamp
  signer.save()
}

export function handleCancelThawSigner(event: SignerThawing): void {
  let signer = createOrLoadSigner(event.params.authorizedSigner)
  signer.payer = event.params.payer
  signer.isAuthorized = true
  signer.thawEndTimestamp = ZERO_BI
  signer.save()
}

export function handlePaymentCollected(event: PaymentCollected): void {
  let index = event.logIndex.toI32()
  let transactionId = event.transaction.hash.concatI32(index)
  let transaction = new Transaction(transactionId)
  let payer = createOrLoadPayer(event.params.payer)
  let receiver = createOrLoadReceiver(event.params.receiver)
  let escrow = createOrLoadEscrowAccount(event.params.payer, event.params.dataService, event.params.receiver)
  let total_tokens_collected = escrow.balance.minus(event.params.tokensDataService).minus(event.params.tokensReceiver)
  escrow.balance = total_tokens_collected
  transaction.type = "redeem"
  transaction.payer = payer.id
  transaction.receiver = receiver.id

  transaction.tokens = total_tokens_collected
  transaction.paymentType = event.params.paymentType
  transaction.escrowAccount = escrow.id
  transaction.transactionGroupID = event.transaction.hash
  transaction.timestamp = event.block.timestamp

  transaction.save()
  escrow.save()
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
