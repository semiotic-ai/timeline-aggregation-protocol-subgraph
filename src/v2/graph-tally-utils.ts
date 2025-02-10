import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import {
    Payer,
    ReceiverV2 as Receiver,
    EscrowAccountV2 as EscrowAccount,
    SignerV2 as Signer,
    Collector,
    LatestRav,
    DataService
} from '../../generated/schema'
const ZERO_BI = BigInt.fromI32(0)
const ZERO_AD = Address.zero()


export const GRAPH_TALLY_COLLECTOR = Address.fromString("undefined");

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
        if (id == GRAPH_TALLY_COLLECTOR) {
            collector.type = "GRAPH_TALLY"
        } else {
            collector.type = "unknown"
        }
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

export function createOrLoadLatestRav(payer: Bytes, dataService: Bytes, serviceProvider: Bytes): LatestRav {
    let latest_rav_id = payer.concat(dataService).concat(serviceProvider)
    let latestRav = LatestRav.load(latest_rav_id)
    if (latestRav == null) {
        latestRav = new LatestRav(latest_rav_id)
        latestRav.valueAggregate = ZERO_BI
        latestRav.timestamp = ZERO_BI
        latestRav.serviceProvider = serviceProvider
        latestRav.payer = payer
        latestRav.dataService = dataService
        latestRav.metadata = Bytes.empty()
        latestRav.signature = Bytes.empty()
        latestRav.save()
    }
    return latestRav as LatestRav
}

export function createOrLoadDataService(id: Bytes): DataService {
    let dataService = DataService.load(id)
    if (dataService == null) {
        dataService = new DataService(id)
        dataService.save()
    }
    return dataService as DataService
}