import {
  CancelThaw,
  Deposit,
  EscrowCollected,
  Thaw,
  Withdraw,
} from "../generated/PaymentsEscrow/PaymentsEscrow"
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


export function handleThaw(event: Thaw): void {
  let payer = createOrLoadPayer(event.params.payer)
  let receiver = createOrLoadReceiver(event.params.receiver)
  let collector = createOrLoadCollector(event.params.collector)
  let escrow = createOrLoadEscrowAccount(event.params.payer, event.params.collector, event.params.receiver)

  escrow.totalAmountThawing = event.params.tokens
  escrow.thawEndTimestamp = event.params.thawEndTimestamp
  escrow.payer = payer.id
  escrow.receiver = receiver.id
  escrow.collector = collector.id
  escrow.save()

}

// TODO: re enable this handler since its unusable at the current state of the contract
// export function handleCancelThaw(event: CancelThaw): void {
//   // TODO: The contract/abi needs to be updated since here collector is not included and it should be
//   // This is not our fault but rather a mistake from E&N so need to wait for the to fix it
//   let escrow = createOrLoadEscrowAccount(event.params.payer, event.params.collector, event.params.receiver)
//   escrow.totalAmountThawing = ZERO_BI
//   escrow.thawEndTimestamp = ZERO_BI
//   escrow.save()
// }

export function handleDeposit(event: Deposit): void {
  let index = event.logIndex.toI32()
  let transactionId = event.transaction.hash.concatI32(index)
  let transaction = new Transaction(transactionId)
  let payer = createOrLoadPayer(event.params.payer)
  let receiver = createOrLoadReceiver(event.params.receiver)
  let collector = createOrLoadCollector(event.params.collector)
  let escrow = createOrLoadEscrowAccount(event.params.payer, event.params.collector, event.params.receiver)

  escrow.balance = escrow.balance.plus(event.params.tokens)

  transaction.type = "deposit"
  transaction.payer = payer.id
  transaction.receiver = receiver.id
  transaction.collector = collector.id
  transaction.tokens = event.params.tokens
  transaction.escrowAccount = escrow.id
  transaction.transactionGroupID = event.transaction.hash
  transaction.timestamp = event.block.timestamp

  transaction.save()
  escrow.save()
}

export function handleWidthrawals(event: Withdraw): void {
  let index = event.logIndex.toI32()
  let transactionId = event.transaction.hash.concatI32(index)
  let transaction = new Transaction(transactionId)
  let payer = createOrLoadPayer(event.params.payer)
  let receiver = createOrLoadReceiver(event.params.receiver)
  let collector = createOrLoadCollector(event.params.collector)
  let escrow = createOrLoadEscrowAccount(event.params.payer, event.params.collector, event.params.receiver)

  escrow.balance = escrow.balance.minus(event.params.tokens)
  escrow.totalAmountThawing = ZERO_BI
  escrow.thawEndTimestamp = ZERO_BI

  transaction.type = "withdraw"
  transaction.payer = payer.id
  transaction.receiver = receiver.id
  transaction.collector = collector.id
  transaction.tokens = event.params.tokens
  transaction.escrowAccount = escrow.id
  transaction.transactionGroupID = event.transaction.hash
  transaction.timestamp = event.block.timestamp

  transaction.save()
  escrow.save()

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
