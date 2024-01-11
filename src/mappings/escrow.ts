/* eslint-disable prefer-const */
import { BigInt } from '@graphprotocol/graph-ts'
import {
    Transaction,
    Sender,
    Receiver,
    EscrowAccount,
    Signer
} from '../types/schema'
import { Deposit, Withdraw, Redeem, Thaw, AuthorizeSigner, RevokeAuthorizedSigner, CancelThaw, CancelThawSigner} from '../types/Escrow/Escrow'
let ZERO_BI = BigInt.fromI32(0)
let ZERO_AD = '0x0000000000000000000000000000000000000000'

export function handleThaw(event: Thaw): void {
    let sender = createOrLoadSender(event.params.sender.toHexString())
    let receiver = createOrLoadReceiver(event.params.receiver.toHexString())
    let escrow = createOrLoadEscrowAccount(event.params.sender.toHexString(), event.params.receiver.toHexString())

    escrow.totalAmountThawing = event.params.totalAmountThawing
    escrow.thawEndTimestamp = event.params.thawEndTimestamp
    escrow.sender = sender.id
    escrow.receiver = receiver.id
    escrow.save()
    
}

export function handleCancelThaw(event: CancelThaw): void {
    let escrow = createOrLoadEscrowAccount(event.params.sender.toHexString(), event.params.receiver.toHexString())
    escrow.totalAmountThawing = ZERO_BI
    escrow.thawEndTimestamp = ZERO_BI
    escrow.save()
}

export function handleDeposit(event: Deposit): void {
    let transaction = new Transaction(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
    let sender = createOrLoadSender(event.params.sender.toHexString())
    let receiver = createOrLoadReceiver(event.params.receiver.toHexString())
    let escrow = createOrLoadEscrowAccount(event.params.sender.toHexString(), event.params.receiver.toHexString())

    escrow.balance = escrow.balance.plus(event.params.amount)

    transaction.type = "deposit"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
    transaction.amount = event.params.amount
    transaction.escrowAccount = escrow.id
    transaction.transactionGroupID = event.transaction.hash.toHexString()

    transaction.save()
    escrow.save()
}

export function handleWidthrawals(event: Withdraw): void {
    let transaction = new Transaction(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
    let sender = createOrLoadSender(event.params.sender.toHexString())
    let receiver = createOrLoadReceiver(event.params.receiver.toHexString())
    let escrow = createOrLoadEscrowAccount(event.params.sender.toHexString(), event.params.receiver.toHexString())

    escrow.balance = escrow.balance.minus(event.params.amount)
    escrow.totalAmountThawing = ZERO_BI
    escrow.thawEndTimestamp = ZERO_BI
    
    transaction.type = "withdraw"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
    transaction.amount = event.params.amount
    transaction.escrowAccount = escrow.id
    transaction.transactionGroupID = event.transaction.hash.toHexString()

    transaction.save()
    escrow.save()
    
}

export function handleRedeems(event: Redeem): void {
    let transaction = new Transaction(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
    let sender = createOrLoadSender(event.params.sender.toHexString())
    let receiver = createOrLoadReceiver(event.params.receiver.toHexString())
    let escrow = createOrLoadEscrowAccount(event.params.sender.toHexString(), event.params.receiver.toHexString())
    escrow.balance = escrow.balance.minus(event.params.actualAmount)
    transaction.type = "redeem"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
  
    transaction.amount = event.params.actualAmount
    transaction.expectedAmount = event.params.expectedAmount
    transaction.allocationID = event.params.allocationID.toHexString()
    transaction.escrowAccount = escrow.id
    transaction.transactionGroupID = event.transaction.hash.toHexString()
        
    transaction.save()
    escrow.save()
    
}

export function handleSignerAuthorization(event: AuthorizeSigner): void {
    let signer = createOrLoadSigner(event.params.signer.toHexString())
    signer.isAuthorized = true
    signer.sender = event.params.sender.toHexString()
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function handleRevokeSignerAuthorization(event: RevokeAuthorizedSigner): void {
    let signer = createOrLoadSigner(event.params.authorizedSigner.toHexString())
    signer.isAuthorized = false
    signer.sender = event.params.sender.toHexString()
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function handleThawSigner(event: CancelThawSigner): void {
    let signer = createOrLoadSigner(event.params.authorizedSigner.toHexString())
    signer.sender = event.params.sender.toHexString()
    signer.isAuthorized = true
    signer.thawEndTimestamp = event.params.thawEndTimestamp
    signer.save()
}

export function handleCancelThawSigner(event: CancelThawSigner): void {
    let signer = createOrLoadSigner(event.params.authorizedSigner.toHexString())
    signer.sender = event.params.sender.toHexString()
    signer.isAuthorized = true
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function createOrLoadSender(id: string): Sender{
    let sender = Sender.load(id)
    if(sender == null){
        sender = new Sender(id)
        sender.save()
    }
    return sender as Sender
}

export function createOrLoadReceiver(id: string): Receiver{
    let receiver = Receiver.load(id)
    if(receiver == null){
        receiver = new Receiver(id)
        receiver.save()
    }
    return receiver as Receiver
}

export function createOrLoadSigner(id: string): Signer{
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

export function createOrLoadEscrowAccount(sender: string, receiver: string): EscrowAccount{
    let sender_receiver = sender + '-' + receiver
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