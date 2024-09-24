// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";


import "./tax/ITaxHandler.sol";

contract AraraCoin is ERC20, ERC20Permit, Ownable {
    address public thirdPartyServices = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address public preSale = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address public initialLaunch = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
    address public investors = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;
    address public teamAndFounders = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc;
    address public preservationProjects = 0x976EA74026E726554dB657fA54763abd0C3a0aa9;
    uint256 private constant TOTAL_SUPPLY = 100_000_000_000 * 10 ** 18;
    
    ITaxHandler public taxHandler;
    bool public tradingEnabled;
    
    using EnumerableSet for EnumerableSet.AddressSet;
    /// @dev The set of addresses exempt from tax.
    EnumerableSet.AddressSet private _canTrade;
    
    event TradingEnabled();
    /// @notice Emitted when the tax handler contract is changed.
    event TaxHandlerChanged(address oldAddress, address newAddress);

    constructor(address initialOwner, address taxHandlerAddress, address teamAndFoundersVesting)
        ERC20("AraraCoin", "ARA")
        ERC20Permit("AraraCoin")
        Ownable(initialOwner)
    {
        taxHandler = ITaxHandler(taxHandlerAddress);
        _canTrade.add(address(0));
        _canTrade.add(initialOwner);        
        _mint(msg.sender, TOTAL_SUPPLY);
       
        _transfer(msg.sender, thirdPartyServices, TOTAL_SUPPLY * 5 / 100); // 5.0% 
        _transfer(msg.sender, preSale,  TOTAL_SUPPLY * 10 / 100); // 10.0%
        _transfer(msg.sender, initialLaunch,  TOTAL_SUPPLY * 20 / 100); // 20.0%
        _transfer(msg.sender, investors,  TOTAL_SUPPLY * 25 / 100); // 25.0%
        //_transfer(msg.sender, teamAndFounders,  TOTAL_SUPPLY * 20 / 100); // 20.0%
        _transfer(msg.sender, teamAndFoundersVesting,  TOTAL_SUPPLY * 20 / 100); // 20.0%
        _transfer(msg.sender, preservationProjects, TOTAL_SUPPLY * 20 / 100); // 20.0%
    }

    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "AraraCoin trading already enabled");
        tradingEnabled = true;
        emit TradingEnabled();
    }

    function setTaxHandler(address taxHandlerAddress) external onlyOwner {
        address oldTaxHandlerAddress = address(taxHandler);
        taxHandler = ITaxHandler(taxHandlerAddress);

        emit TaxHandlerChanged(oldTaxHandlerAddress, taxHandlerAddress);
    }

    function addCanTrade(
        address[] calldata allowedAddresses
    ) external onlyOwner {
        require(!tradingEnabled, "TGC: trading already enabled");
        require(allowedAddresses.length != 0, "TGC: invalid parameters");
        for (uint256 i = 0; i < allowedAddresses.length; i++) {
            _canTrade.add(allowedAddresses[i]);
        }
    }

    function _update(address from, address to, uint256 value) 
        internal virtual override(ERC20)
    {
        if (!tradingEnabled) {
            require(_canTrade.contains(from), "AraraCoin trade is disabled");
        }

        uint256 tax = taxHandler.getTax(from, to, value);
        uint256 taxedAmount = value - tax;

        super._update(from, owner(), tax);
        super._update(from, to, taxedAmount);
    }

    function addressToString(address _addr) public pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    function concatenateAddressWithString(address _addr, string memory _str) public pure returns (string memory) {
        string memory addrStr = addressToString(_addr);
        return string(abi.encodePacked(addrStr, _str));
    }
}

// uint256 thirdPartyServices = TOTAL_SUPPLY * 5 / 100;
// uint256 preSale = TOTAL_SUPPLY * 10 / 100;
// uint256 initialLaunch = TOTAL_SUPPLY * 20 / 100;
// uint256 investors = TOTAL_SUPPLY * 25 / 100;
// uint256 teamAndFounders = TOTAL_SUPPLY * 20 / 100;
// uint256 preservationProjects = TOTAL_SUPPLY * 20 / 100;