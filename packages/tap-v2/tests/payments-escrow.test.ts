import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { AuthorizedCollector } from "../generated/schema"
import { AuthorizedCollector as AuthorizedCollectorEvent } from "../generated/PaymentsEscrow/PaymentsEscrow"
import { handleAuthorizedCollector } from "../src/payments-escrow"
import { createAuthorizedCollectorEvent } from "./payments-escrow-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let payer = Address.fromString("0x0000000000000000000000000000000000000001")
    let collector = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let addedAllowance = BigInt.fromI32(234)
    let newTotalAllowance = BigInt.fromI32(234)
    let newAuthorizedCollectorEvent = createAuthorizedCollectorEvent(
      payer,
      collector,
      addedAllowance,
      newTotalAllowance
    )
    handleAuthorizedCollector(newAuthorizedCollectorEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AuthorizedCollector created and stored", () => {
    assert.entityCount("AuthorizedCollector", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AuthorizedCollector",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "payer",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AuthorizedCollector",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "collector",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AuthorizedCollector",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "addedAllowance",
      "234"
    )
    assert.fieldEquals(
      "AuthorizedCollector",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "newTotalAllowance",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
