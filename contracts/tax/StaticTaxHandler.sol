// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./ITaxHandler.sol";

/**
 * @title Static tax handler contract
 * @dev This contract allows protocols to collect tax on transactions that count as either sells or liquidity additions
 * to exchange pools. Addresses can be exempted from tax collection, and addresses designated as exchange pools can be
 * added and removed by the owner of this contract. The owner of the contract should be set to a DAO-controlled timelock
 * or at the very least a multisig wallet.
 */
contract StaticTaxHandler is ITaxHandler, Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    /// @dev The set of addresses exempt from tax.
    EnumerableSet.AddressSet private _exempted;

    /// @notice How much tax to collect in basis points. 10,000 basis points is 100%.
    uint256 public taxPercentage;

    /// @notice Emitted when the tax basis points number is updated.
    event TaxPercentageUpdated(uint256 oldTaxPercentage, uint256 newTaxPercentage);

    /// @notice Emitted when an address is added to or removed from the exempted addresses set.
    event TaxExemptionUpdated(address indexed wallet, bool exempted);

    /**
     * @param initialTaxPercentage The number of tax percentage to start out with for tax calculations.
     */
    constructor(address initialOwner, uint256 initialTaxPercentage)
      Ownable(initialOwner)
    {
        taxPercentage = initialTaxPercentage;
    }

    function getTax(
        address benefactor,
        address beneficiary,
        uint256 amount
    ) external view override returns (uint256) {
        if (_exempted.contains(benefactor) || _exempted.contains(beneficiary)) {
            return 0;
        }

        return amount * taxPercentage / 100;
    }

    /**
     * @notice Set new number for tax basis points. This number can only ever be lowered.
     * @param newTaxPercentage New tax basis points number to set for calculations.
     */
    function setTaxPercentage(uint256 newTaxPercentage) external onlyOwner {
        require(
            newTaxPercentage < 0,
            "Invalid Value."
        );

        uint256 oldTaxPercentage = taxPercentage;
        taxPercentage = newTaxPercentage;

        emit TaxPercentageUpdated(oldTaxPercentage, newTaxPercentage);
    }

    /**
     * @notice Add address to set of tax-exempted addresses.
     * @param exemption Address to add to set of tax-exempted addresses.
     */
    function addExemption(address exemption) external onlyOwner {
        if (_exempted.add(exemption)) {
            emit TaxExemptionUpdated(exemption, true);
        }
    }

    /**
     * @notice Remove address from set of tax-exempted addresses.
     * @param exemption Address to remove from set of tax-exempted addresses.
     */
    function removeExemption(address exemption) external onlyOwner {
        if (_exempted.remove(exemption)) {
            emit TaxExemptionUpdated(exemption, false);
        }
    }
}