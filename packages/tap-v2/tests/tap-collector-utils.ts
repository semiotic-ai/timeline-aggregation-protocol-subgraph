import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  EIP712DomainChanged,
  GraphDirectoryInitialized,
  PaymentCollected,
  RAVCollected,
  SignerAuthorized,
  SignerRevoked,
  SignerThawCanceled,
  SignerThawing
} from "../generated/TapCollector/TapCollector"

export function createEIP712DomainChangedEvent(): EIP712DomainChanged {
  let eip712DomainChangedEvent = changetype<EIP712DomainChanged>(newMockEvent())

  eip712DomainChangedEvent.parameters = new Array()

  return eip712DomainChangedEvent
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

export function createPaymentCollectedEvent(
  paymentType: i32,
  payer: Address,
  receiver: Address,
  tokensReceiver: BigInt,
  dataService: Address,
  tokensDataService: BigInt
): PaymentCollected {
  let paymentCollectedEvent = changetype<PaymentCollected>(newMockEvent())

  paymentCollectedEvent.parameters = new Array()

  paymentCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "paymentType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(paymentType))
    )
  )
  paymentCollectedEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  paymentCollectedEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  )
  paymentCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "tokensReceiver",
      ethereum.Value.fromUnsignedBigInt(tokensReceiver)
    )
  )
  paymentCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "dataService",
      ethereum.Value.fromAddress(dataService)
    )
  )
  paymentCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "tokensDataService",
      ethereum.Value.fromUnsignedBigInt(tokensDataService)
    )
  )

  return paymentCollectedEvent
}

export function createRAVCollectedEvent(
  payer: Address,
  dataService: Address,
  serviceProvider: Address,
  timestampNs: BigInt,
  valueAggregate: BigInt,
  metadata: Bytes,
  signature: Bytes
): RAVCollected {
  let ravCollectedEvent = changetype<RAVCollected>(newMockEvent())

  ravCollectedEvent.parameters = new Array()

  ravCollectedEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  ravCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "dataService",
      ethereum.Value.fromAddress(dataService)
    )
  )
  ravCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "serviceProvider",
      ethereum.Value.fromAddress(serviceProvider)
    )
  )
  ravCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "timestampNs",
      ethereum.Value.fromUnsignedBigInt(timestampNs)
    )
  )
  ravCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "valueAggregate",
      ethereum.Value.fromUnsignedBigInt(valueAggregate)
    )
  )
  ravCollectedEvent.parameters.push(
    new ethereum.EventParam("metadata", ethereum.Value.fromBytes(metadata))
  )
  ravCollectedEvent.parameters.push(
    new ethereum.EventParam("signature", ethereum.Value.fromBytes(signature))
  )

  return ravCollectedEvent
}

export function createSignerAuthorizedEvent(
  payer: Address,
  authorizedSigner: Address
): SignerAuthorized {
  let signerAuthorizedEvent = changetype<SignerAuthorized>(newMockEvent())

  signerAuthorizedEvent.parameters = new Array()

  signerAuthorizedEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  signerAuthorizedEvent.parameters.push(
    new ethereum.EventParam(
      "authorizedSigner",
      ethereum.Value.fromAddress(authorizedSigner)
    )
  )

  return signerAuthorizedEvent
}

export function createSignerRevokedEvent(
  payer: Address,
  authorizedSigner: Address
): SignerRevoked {
  let signerRevokedEvent = changetype<SignerRevoked>(newMockEvent())

  signerRevokedEvent.parameters = new Array()

  signerRevokedEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  signerRevokedEvent.parameters.push(
    new ethereum.EventParam(
      "authorizedSigner",
      ethereum.Value.fromAddress(authorizedSigner)
    )
  )

  return signerRevokedEvent
}

export function createSignerThawCanceledEvent(
  payer: Address,
  authorizedSigner: Address,
  thawEndTimestamp: BigInt
): SignerThawCanceled {
  let signerThawCanceledEvent = changetype<SignerThawCanceled>(newMockEvent())

  signerThawCanceledEvent.parameters = new Array()

  signerThawCanceledEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  signerThawCanceledEvent.parameters.push(
    new ethereum.EventParam(
      "authorizedSigner",
      ethereum.Value.fromAddress(authorizedSigner)
    )
  )
  signerThawCanceledEvent.parameters.push(
    new ethereum.EventParam(
      "thawEndTimestamp",
      ethereum.Value.fromUnsignedBigInt(thawEndTimestamp)
    )
  )

  return signerThawCanceledEvent
}

export function createSignerThawingEvent(
  payer: Address,
  authorizedSigner: Address,
  thawEndTimestamp: BigInt
): SignerThawing {
  let signerThawingEvent = changetype<SignerThawing>(newMockEvent())

  signerThawingEvent.parameters = new Array()

  signerThawingEvent.parameters.push(
    new ethereum.EventParam("payer", ethereum.Value.fromAddress(payer))
  )
  signerThawingEvent.parameters.push(
    new ethereum.EventParam(
      "authorizedSigner",
      ethereum.Value.fromAddress(authorizedSigner)
    )
  )
  signerThawingEvent.parameters.push(
    new ethereum.EventParam(
      "thawEndTimestamp",
      ethereum.Value.fromUnsignedBigInt(thawEndTimestamp)
    )
  )

  return signerThawingEvent
}
