// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/finance/VestingWallet.sol";
import {VestingWalletCliff} from "./abstract/VestingWalletCliff.sol";

contract MyVestingWallet is VestingWalletCliff {
    constructor(
        address beneficiary,
        uint64 startTimestamp,
        uint64 durationSeconds,
        uint64 cliffSeconds
    )
        VestingWallet(beneficiary, startTimestamp, durationSeconds)
        VestingWalletCliff(cliffSeconds)
    {
        require(beneficiary != address(0), "Beneficiary address cannot be zero");
        require(startTimestamp > block.timestamp, "Start timestamp must be in the future");
        require(durationSeconds > 0, "Vesting duration must be greater than zero");
        require(cliffSeconds <= durationSeconds, "Cliff duration must be less than or equal to vesting duration");
    }
}