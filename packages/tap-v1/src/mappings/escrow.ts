/* eslint-disable prefer-const */
import { BigInt, Bytes } from '@graphprotocol/graph-ts'
import {
    Transaction,
    Sender,
    Receiver,
    EscrowAccount,
    Signer
} from '../types/schema'
import { Deposit, Withdraw, Redeem, Thaw, AuthorizeSigner, RevokeAuthorizedSigner, CancelThaw, CancelThawSigner} from '../types/Escrow/Escrow'
let ZERO_BI = BigInt.fromI32(0)
let ZERO_AD = Bytes.fromHexString('0x0000000000000000000000000000000000000000')

export function handleThaw(event: Thaw): void {
    let sender = createOrLoadSender(event.params.sender)
    let receiver = createOrLoadReceiver(event.params.receiver)
    let escrow = createOrLoadEscrowAccount(event.params.sender, event.params.receiver)

    escrow.totalAmountThawing = event.params.totalAmountThawing
    escrow.thawEndTimestamp = event.params.thawEndTimestamp
    escrow.sender = sender.id
    escrow.receiver = receiver.id
    escrow.save()
    
}

export function handleCancelThaw(event: CancelThaw): void {
    let escrow = createOrLoadEscrowAccount(event.params.sender, event.params.receiver)
    escrow.totalAmountThawing = ZERO_BI
    escrow.thawEndTimestamp = ZERO_BI
    escrow.save()
}

export function handleDeposit(event: Deposit): void {
    let index = event.logIndex.toI32()
    let transactionId = event.transaction.hash.concatI32(index)
    let transaction = new Transaction(transactionId)
    let sender = createOrLoadSender(event.params.sender)
    let receiver = createOrLoadReceiver(event.params.receiver)
    let escrow = createOrLoadEscrowAccount(event.params.sender, event.params.receiver)

    escrow.balance = escrow.balance.plus(event.params.amount)

    transaction.type = "deposit"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
    transaction.amount = event.params.amount
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
    let sender = createOrLoadSender(event.params.sender)
    let receiver = createOrLoadReceiver(event.params.receiver)
    let escrow = createOrLoadEscrowAccount(event.params.sender, event.params.receiver)

    escrow.balance = escrow.balance.minus(event.params.amount)
    escrow.totalAmountThawing = ZERO_BI
    escrow.thawEndTimestamp = ZERO_BI
    
    transaction.type = "withdraw"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
    transaction.amount = event.params.amount
    transaction.escrowAccount = escrow.id
    transaction.transactionGroupID = event.transaction.hash
    transaction.timestamp = event.block.timestamp

    transaction.save()
    escrow.save()
    
}

export function handleRedeems(event: Redeem): void {
    let index = event.logIndex.toI32()
    let transactionId = event.transaction.hash.concatI32(index)
    let transaction = new Transaction(transactionId)
    let sender = createOrLoadSender(event.params.sender)
    let receiver = createOrLoadReceiver(event.params.receiver)
    let escrow = createOrLoadEscrowAccount(event.params.sender, event.params.receiver)
    escrow.balance = escrow.balance.minus(event.params.actualAmount)
    transaction.type = "redeem"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
  
    transaction.amount = event.params.actualAmount
    transaction.expectedAmount = event.params.expectedAmount
    transaction.allocationID = event.params.allocationID
    transaction.escrowAccount = escrow.id
    transaction.transactionGroupID = event.transaction.hash
    transaction.timestamp = event.block.timestamp
        
    transaction.save()
    escrow.save()
    
}

export function handleSignerAuthorization(event: AuthorizeSigner): void {
    let signer = createOrLoadSigner(event.params.signer)
    signer.isAuthorized = true
    signer.sender = event.params.sender
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function handleRevokeSignerAuthorization(event: RevokeAuthorizedSigner): void {
    let signer = createOrLoadSigner(event.params.authorizedSigner)
    signer.isAuthorized = false
    signer.sender = event.params.sender
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function handleThawSigner(event: CancelThawSigner): void {
    let signer = createOrLoadSigner(event.params.authorizedSigner)
    signer.sender = event.params.sender
    signer.isAuthorized = true
    signer.thawEndTimestamp = event.params.thawEndTimestamp
    signer.save()
}

export function handleCancelThawSigner(event: CancelThawSigner): void {
    let signer = createOrLoadSigner(event.params.authorizedSigner)
    signer.sender = event.params.sender
    signer.isAuthorized = true
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function createOrLoadSender(id: Bytes): Sender{
    let sender = Sender.load(id)
    if(sender == null){
        sender = new Sender(id)
        sender.save()
    }
    return sender as Sender
}

export function createOrLoadReceiver(id: Bytes): Receiver{
    let receiver = Receiver.load(id)
    if(receiver == null){
        receiver = new Receiver(id)
        receiver.save()
    }
    return receiver as Receiver
}

export function createOrLoadSigner(id: Bytes): Signer{
    let signer = Signer.load(id)
    if(signer == null){
        signer = new Signer(id)
        signer.isAuthorized = false
        signer.sender = ZERO_AD
        signer.thawEndTimestamp = ZERO_BI
        signer.save()
    }
    return signer as Signer
}

export function createOrLoadEscrowAccount(sender: Bytes, receiver: Bytes): EscrowAccount{
    let sender_receiver = sender.concat(receiver)
    let escrowAccount = EscrowAccount.load(sender_receiver)
    if(escrowAccount == null){
        escrowAccount = new EscrowAccount(sender_receiver)
        escrowAccount.balance = ZERO_BI
        escrowAccount.thawEndTimestamp = ZERO_BI
        escrowAccount.totalAmountThawing = ZERO_BI
        escrowAccount.sender = sender
        escrowAccount.receiver = receiver
        escrowAccount.save()
    }
    return escrowAccount as EscrowAccount
}