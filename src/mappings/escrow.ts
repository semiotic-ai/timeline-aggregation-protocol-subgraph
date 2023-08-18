/* eslint-disable prefer-const */
import { BigInt, BigDecimal } from '@graphprotocol/graph-ts'
import {
    Transaction,
    Sender,
    Receiver,
    EscrowAccount,
    AuthorizedSigner,
} from '../types/schema'
import { Deposit, Withdraw, Redeem, Thaw, AuthorizeSigner, RevokeAuthorizedSigner} from '../types/Escrow/Escrow'
let ZERO_BD = BigDecimal.fromString('0')
let ZERO_BI = BigInt.fromI32(0)

export function handleThaw(event: Thaw): void {
    let sender_receiver = event.params.sender.toHexString() + event.params.receiver.toHexString()
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
        escrow.totalAmountThawing = escrow.totalAmountThawing.plus(event.params.totalAmountThawing.toBigDecimal())
        escrow.thawnEndTimestamp = event.params.thawEndTimestamp
        escrow.sender = sender.id
        escrow.receiver = receiver.id
        escrow.save()
    }
    
}
export function handleDeposit(event: Deposit): void {
    let transaction = new Transaction(event.transaction.hash.toHexString())
    let sender = Sender.load(event.params.sender.toHexString())
    let receiver =  Receiver.load(event.params.receiver.toHexString())
    let sender_receiver = event.params.sender.toHexString() + event.params.receiver.toHexString()
    let escrow = EscrowAccount.load(sender_receiver)
    if(sender == null){
        sender = new Sender(event.params.sender.toHexString())
    }
    if(receiver == null){
        receiver = new Receiver(event.params.receiver.toHexString())
    }
    if (escrow == null){
        escrow = new EscrowAccount(sender_receiver)
        escrow.balance = event.params.amount.toBigDecimal()
        escrow.thawnEndTimestamp = ZERO_BI
        escrow.totalAmountThawing = ZERO_BD
        escrow.sender = sender.id
        escrow.receiver = receiver.id
    }else{
        escrow.balance = escrow.balance.plus(event.params.amount.toBigDecimal())
    }
    transaction.type = "deposit"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
    transaction.amount = event.params.amount.toBigDecimal()


    sender.save()
    receiver.save()
    transaction.save()
    escrow.save()
}

export function handleWidthrawals(event: Withdraw): void {
    

    let transaction = new Transaction(event.transaction.hash.toHexString())
    let sender = Sender.load(event.params.sender.toHexString())
    let receiver =  Receiver.load(event.params.receiver.toHexString())
    let sender_receiver = event.params.sender.toHexString() + event.params.receiver.toHexString()
    let escrow = EscrowAccount.load(sender_receiver)
    // EscrowAccounts are created at deposit otherwise a widthrawal cant be called
    if (escrow != null){
        escrow.balance = escrow.balance.minus(event.params.amount.toBigDecimal())
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

    transaction.type = "widthraw"
    transaction.sender = sender.id
    transaction.receiver = receiver.id
    transaction.amount = event.params.amount.toBigDecimal()

    transaction.save()
    
}

export function handleRedeems(event: Redeem): void {
    
    let transaction = new Transaction(event.transaction.hash.toHexString())
    let sender = Sender.load(event.params.sender.toHexString())
    let receiver =  Receiver.load(event.params.receiver.toHexString())
    let sender_receiver = event.params.sender.toHexString() + event.params.receiver.toHexString()
    let escrow = EscrowAccount.load(sender_receiver)
    // EscrowAccounts are created at deposit otherwise a redeem cant be called
    if (escrow != null){
        escrow.balance = escrow.balance.minus(event.params.actualAmount.toBigDecimal())
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
  
    transaction.amount = event.params.actualAmount.toBigDecimal()
    transaction.expectedAmount = event.params.expectedAmount.toBigDecimal()
    transaction.allocationID = event.params.allocationID.toHexString()
    
    sender.save()
    receiver.save()
    transaction.save()
    
}

export function handleSignerAuthorization(event: AuthorizeSigner): void {
    let signer = AuthorizedSigner.load(event.params.signer.toHexString())
    if(signer == null){
        signer = new AuthorizedSigner(event.params.signer.toHexString())
    }
    
    signer.is_authorized = true
    signer.sender = event.params.sender.toHexString()
    signer.save()
}

export function handleRevokeSignerAuthorization(event: RevokeAuthorizedSigner): void {
    let signer = AuthorizedSigner.load(event.params.authorizedSigner.toHexString())
    if(signer == null){
        signer = new AuthorizedSigner(event.params.authorizedSigner.toHexString())
    }
    signer.is_authorized = true
    signer.sender = event.params.sender.toHexString()
    signer.save()
}