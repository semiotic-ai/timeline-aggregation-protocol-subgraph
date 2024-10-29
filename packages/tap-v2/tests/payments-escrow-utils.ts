import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  AuthorizedCollector,
  CancelThaw,
  CancelThawCollector,
  Deposit,
  EscrowCollected,
  GraphDirectoryInitialized,
  Initialized,
  RevokeCollector,
  Thaw,
  ThawCollector,
  Withdraw
} from "../generated/PaymentsEscrow/PaymentsEscrow"

export function createAuthorizedCollectorEvent(
  payer: Address,
  collector: Address,
  addedAllowance: BigInt,
  newTotalAllowance: BigInt
): AuthorizedCollector {
  let authorizedCollectorEvent = changetype<AuthorizedCollector>(newMockEvent())

  authorizedCollectorEvent.parameters = new Array()

  authorizedCollectorEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  authorizedCollectorEvent.parameters.push(
    new ethereum.EventParam("collector", ethereum.Value.fromAddress(collector))
  )
  authorizedCollectorEvent.parameters.push(
    new ethereum.EventParam(
      "addedAllowance",
      ethereum.Value.fromUnsignedBigInt(addedAllowance)
    )
  )
  authorizedCollectorEvent.parameters.push(
    new ethereum.EventParam(
      "newTotalAllowance",
      ethereum.Value.fromUnsignedBigInt(newTotalAllowance)
    )
  )

  return authorizedCollectorEvent
}

export function createCancelThawEvent(
  payer: Address,
  receiver: Address
): CancelThaw {
  let cancelThawEvent = changetype<CancelThaw>(newMockEvent())

  cancelThawEvent.parameters = new Array()

  cancelThawEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  cancelThawEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )

  return cancelThawEvent
}

export function createCancelThawCollectorEvent(
  payer: Address,
  collector: Address
): CancelThawCollector {
  let cancelThawCollectorEvent = changetype<CancelThawCollector>(newMockEvent())

  cancelThawCollectorEvent.parameters = new Array()

  cancelThawCollectorEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  cancelThawCollectorEvent.parameters.push(
    new ethereum.EventParam("collector", ethereum.Value.fromAddress(collector))
  )

  return cancelThawCollectorEvent
}

export function createDepositEvent(
  payer: Address,
  collector: Address,
  receiver: Address,
  tokens: BigInt
): Deposit {
  let depositEvent = changetype<Deposit>(newMockEvent())

  depositEvent.parameters = new Array()

  depositEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  depositEvent.parameters.push(
    new ethereum.EventParam("collector", ethereum.Value.fromAddress(collector))
  )
  depositEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  depositEvent.parameters.push(
    new ethereum.EventParam("tokens", ethereum.Value.fromUnsignedBigInt(tokens))
  )

  return depositEvent
}

export function createEscrowCollectedEvent(
  payer: Address,
  collector: Address,
  receiver: Address,
  tokens: BigInt
): EscrowCollected {
  let escrowCollectedEvent = changetype<EscrowCollected>(newMockEvent())

  escrowCollectedEvent.parameters = new Array()

  escrowCollectedEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  escrowCollectedEvent.parameters.push(
    new ethereum.EventParam("collector", ethereum.Value.fromAddress(collector))
  )
  escrowCollectedEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  escrowCollectedEvent.parameters.push(
    new ethereum.EventParam("tokens", ethereum.Value.fromUnsignedBigInt(tokens))
  )

  return escrowCollectedEvent
}

export function createGraphDirectoryInitializedEvent(
  graphToken: Address,
  graphStaking: Address,
  graphPayments: Address,
  graphEscrow: Address,
  graphController: Address,
  graphEpochManager: Address,
  graphRewardsManager: Address,
  graphTokenGateway: Address,
  graphProxyAdmin: Address,
  graphCuration: Address
): GraphDirectoryInitialized {
  let graphDirectoryInitializedEvent = changetype<GraphDirectoryInitialized>(
    newMockEvent()
  )

  graphDirectoryInitializedEvent.parameters = new Array()

  graphDirectoryInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "graphToken",
      ethereum.Value.fromAddress(graphToken)
    )
  )
  graphDirectoryInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "graphStaking",
      ethereum.Value.fromAddress(graphStaking)
    )
  )
  graphDirectoryInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "graphPayments",
      ethereum.Value.fromAddress(graphPayments)
    )
  )
  graphDirectoryInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "graphEscrow",
      ethereum.Value.fromAddress(graphEscrow)
    )
  )
  graphDirectoryInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "graphController",
      ethereum.Value.fromAddress(graphController)
    )
  )
  graphDirectoryInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "graphEpochManager",
      ethereum.Value.fromAddress(graphEpochManager)
    )
  )
  graphDirectoryInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "graphRewardsManager",
      ethereum.Value.fromAddress(graphRewardsManager)
    )
  )
  graphDirectoryInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "graphTokenGateway",
      ethereum.Value.fromAddress(graphTokenGateway)
    )
  )
  graphDirectoryInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "graphProxyAdmin",
      ethereum.Value.fromAddress(graphProxyAdmin)
    )
  )
  graphDirectoryInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "graphCuration",
      ethereum.Value.fromAddress(graphCuration)
    )
  )

  return graphDirectoryInitializedEvent
}

export function createInitializedEvent(version: BigInt): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(version)
    )
  )

  return initializedEvent
}

export function createRevokeCollectorEvent(
  payer: Address,
  collector: Address
): RevokeCollector {
  let revokeCollectorEvent = changetype<RevokeCollector>(newMockEvent())

  revokeCollectorEvent.parameters = new Array()

  revokeCollectorEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  revokeCollectorEvent.parameters.push(
    new ethereum.EventParam("collector", ethereum.Value.fromAddress(collector))
  )

  return revokeCollectorEvent
}

export function createThawEvent(
  payer: Address,
  collector: Address,
  receiver: Address,
  tokens: BigInt,
  thawEndTimestamp: BigInt
): Thaw {
  let thawEvent = changetype<Thaw>(newMockEvent())

  thawEvent.parameters = new Array()

  thawEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  thawEvent.parameters.push(
    new ethereum.EventParam("collector", ethereum.Value.fromAddress(collector))
  )
  thawEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  thawEvent.parameters.push(
    new ethereum.EventParam("tokens", ethereum.Value.fromUnsignedBigInt(tokens))
  )
  thawEvent.parameters.push(
    new ethereum.EventParam(
      "thawEndTimestamp",
      ethereum.Value.fromUnsignedBigInt(thawEndTimestamp)
    )
  )

  return thawEvent
}

export function createThawCollectorEvent(
  payer: Address,
  collector: Address
): ThawCollector {
  let thawCollectorEvent = changetype<ThawCollector>(newMockEvent())

  thawCollectorEvent.parameters = new Array()

  thawCollectorEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  thawCollectorEvent.parameters.push(
    new ethereum.EventParam("collector", ethereum.Value.fromAddress(collector))
  )

  return thawCollectorEvent
}

export function createWithdrawEvent(
  payer: Address,
  collector: Address,
  receiver: Address,
  tokens: BigInt
): Withdraw {
  let withdrawEvent = changetype<Withdraw>(newMockEvent())

  withdrawEvent.parameters = new Array()

  withdrawEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  withdrawEvent.parameters.push(
    new ethereum.EventParam("collector", ethereum.Value.fromAddress(collector))
  )
  withdrawEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  withdrawEvent.parameters.push(
    new ethereum.EventParam("tokens", ethereum.Value.fromUnsignedBigInt(tokens))
  )

  return withdrawEvent
}
