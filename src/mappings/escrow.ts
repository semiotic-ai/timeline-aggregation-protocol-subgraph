/* eslint-disable prefer-const */
import { BigInt } from '@graphprotocol/graph-ts'
import {
    Transaction,
    Sender,
    Receiver,
    EscrowAccount,
    AuthorizedSigner
} from '../types/schema'
import { Deposit, Withdraw, Redeem, Thaw, AuthorizeSigner, RevokeAuthorizedSigner, CancelThaw, CancelThawSigner} from '../types/Escrow/Escrow'
let ZERO_BI = BigInt.fromI32(0)

export function handleThaw(event: Thaw): void {
    let sender_receiver = event.params.sender.toHexString() + '-' + event.params.receiver.toHexString()
    let escrow = EscrowAccount.load(sender_receiver)
    let sender = Sender.load(event.params.sender.toHexString())
    let receiver =  Receiver.load(event.params.receiver.toHexString())
    if(sender == null){
        sender = new Sender(event.params.sender.toHexString())
    }
    if(receiver == null){
        receiver = new Receiver(event.params.receiver.toHexString())
    }
    sender.save()
    receiver.save()
    // EscrowAccounts are created at deposit otherwise thaw cant be called
    if (escrow != null){
        escrow.totalAmountThawing = event.params.totalAmountThawing
        escrow.thawEndTimestamp = event.params.thawEndTimestamp
        escrow.sender = sender.id
        escrow.receiver = receiver.id
        escrow.save()
    }
    
}

export function handleCancelThaw(event: CancelThaw): void {
    
    let sender = Sender.load(event.params.sender.toHexString())
    let receiver =  Receiver.load(event.params.receiver.toHexString())
    let sender_receiver = event.params.sender.toHexString() + '-' + event.params.receiver.toHexString()
    let escrow = EscrowAccount.load(sender_receiver)
    // EscrowAccounts are created at deposit otherwise a withdrawal cant be called
    if (escrow != null){
        escrow.totalAmountThawing = ZERO_BI
        escrow.thawEndTimestamp = ZERO_BI
        escrow.save()
    }
}

export function handleDeposit(event: Deposit): void {
    let transaction = new Transaction(event.transaction.hash.toHexString())
    let sender = Sender.load(event.params.sender.toHexString())
    let receiver =  Receiver.load(event.params.receiver.toHexString())
    let sender_receiver = event.params.sender.toHexString() + '-' + event.params.receiver.toHexString()
    let escrow = EscrowAccount.load(sender_receiver)
    if(sender == null){
        sender = new Sender(event.params.sender.toHexString())
    }
    if(receiver == null){
        receiver = new Receiver(event.params.receiver.toHexString())
    }
    if (escrow == null){
        escrow = new EscrowAccount(sender_receiver)
        escrow.balance = event.params.amount
        escrow.thawEndTimestamp = ZERO_BI
        escrow.totalAmountThawing = ZERO_BI
        escrow.sender = sender.id
        escrow.receiver = receiver.id
    }else{
        escrow.balance = escrow.balance.plus(event.params.amount)
    }
    transaction.type = "deposit"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
    transaction.amount = event.params.amount
    transaction.escrowAccount = sender_receiver


    sender.save()
    receiver.save()
    transaction.save()
    escrow.save()
}

export function handleWidthrawals(event: Withdraw): void {
    

    let transaction = new Transaction(event.transaction.hash.toHexString())
    let sender = Sender.load(event.params.sender.toHexString())
    let receiver =  Receiver.load(event.params.receiver.toHexString())
    let sender_receiver = event.params.sender.toHexString() + '-' + event.params.receiver.toHexString()
    let escrow = EscrowAccount.load(sender_receiver)
    // EscrowAccounts are created at deposit otherwise a withdrawal cant be called
    if (escrow != null){
        escrow.balance = escrow.balance.minus(event.params.amount)
        escrow.totalAmountThawing = ZERO_BI
        escrow.thawEndTimestamp = ZERO_BI
        escrow.save()
    }
    if(sender == null){
      sender = new Sender(event.params.sender.toHexString())
    }
    if(receiver == null){
      receiver = new Receiver(event.params.receiver.toHexString())
    }
    sender.save()
    receiver.save()

    transaction.type = "withdraw"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
    transaction.amount = event.params.amount
    transaction.escrowAccount = sender_receiver

    transaction.save()
    
}

export function handleRedeems(event: Redeem): void {
    
    let transaction = new Transaction(event.transaction.hash.toHexString())
    let sender = Sender.load(event.params.sender.toHexString())
    let receiver =  Receiver.load(event.params.receiver.toHexString())
    let sender_receiver = event.params.sender.toHexString() + '-' + event.params.receiver.toHexString()
    let escrow = EscrowAccount.load(sender_receiver)
    // EscrowAccounts are created at deposit otherwise a redeem cant be called
    if (escrow != null){
        escrow.balance = escrow.balance.minus(event.params.actualAmount)
        escrow.save()
    }
    if(sender == null){
      sender = new Sender(event.params.sender.toHexString())
    }
    if(receiver == null){
      receiver = new Receiver(event.params.receiver.toHexString())
    }
    transaction.type = "redeem"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
  
    transaction.amount = event.params.actualAmount
    transaction.expectedAmount = event.params.expectedAmount
    transaction.allocationID = event.params.allocationID.toHexString()
    transaction.escrowAccount = sender_receiver
    
    sender.save()
    receiver.save()
    transaction.save()
    
}

export function handleSignerAuthorization(event: AuthorizeSigner): void {
    let signer = AuthorizedSigner.load(event.params.signer.toHexString())
    if(signer == null){
        signer = new AuthorizedSigner(event.params.signer.toHexString())
    }
    
    signer.isAuthorized = true
    signer.sender = event.params.sender.toHexString()
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function handleRevokeSignerAuthorization(event: RevokeAuthorizedSigner): void {
    let signer = AuthorizedSigner.load(event.params.authorizedSigner.toHexString())
    if(signer == null){
        signer = new AuthorizedSigner(event.params.authorizedSigner.toHexString())
    }
    signer.isAuthorized = false
    signer.sender = event.params.sender.toHexString()
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}

export function handleThawSigner(event: CancelThawSigner): void {
    
    let signer = AuthorizedSigner.load(event.params.authorizedSigner.toHexString())
    if(signer == null){
        signer = new AuthorizedSigner(event.params.authorizedSigner.toHexString())
    }
    signer.sender = event.params.sender.toHexString()
    signer.isAuthorized = true
    signer.thawEndTimestamp = event.params.thawEndTimestamp
    signer.save()
}

export function handleCancelThawSigner(event: CancelThawSigner): void {
    
    let signer = AuthorizedSigner.load(event.params.authorizedSigner.toHexString())
    if(signer == null){
        signer = new AuthorizedSigner(event.params.authorizedSigner.toHexString())
    }
    signer.sender = event.params.sender.toHexString()
    signer.isAuthorized = true
    signer.thawEndTimestamp = ZERO_BI
    signer.save()
}