// SPDX-License-Identifier: MIT
// This contract is compatible with OpenZeppelin Contracts version ^5.0.0
pragma solidity ^0.8.20;

// Importing OpenZeppelin libraries for ERC20, ERC20Permit, and Ownable functionality
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// Importing a custom interface for tax handling functionality
import "./tax/ITaxHandler.sol";

// The main contract for the AraraCoin token
contract AraraCoin is ERC20, ERC20Permit, Ownable {
    
    // Addresses used for initial token distribution
    address public marketingWallet = 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f;
    address public consultingWallet = 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720;
    address public auditWallet = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address public preSaleWallet = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address public launchWallet = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
    address public investorsWallet = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;
    address public investorsYearOneVestingWallet = 0x71bE63f3384f5fb98995898A86B02Fb2426c5788;
    address public investorsYearTwoVestingWallet = 0xFABB0ac9d68B0B445fB7357272Ff202C5651694a;
    address public teamVestingWallet = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc;
    address public foundersVestingWallet = 0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec;
    address public companyVestingWallet = 0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097;
    address public preservationProjectsVestingWallet = 0x976EA74026E726554dB657fA54763abd0C3a0aa9;
    
    // Total supply of the token, set at 100 billion tokens, with 18 decimals
    uint256 private constant TOTAL_SUPPLY = 100_000_000_000 * 10 ** 18;
    
    // Address where tax funds will be sent
    address public taxWallet = 0xbDA5747bFD65F08deb54cb465eB87D40e51B197E;

    // Instance of the ITaxHandler interface for managing taxes on transfers
    ITaxHandler public taxHandler;

    // A boolean that indicates whether trading has been enabled
    bool public tradingEnabled;
    
    // A set of addresses that are allowed to trade before trading is officially enabled
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private _canTrade;

    // Event emitted when trading is enabled
    event TradingEnabled();

    // Event emitted when the tax handler is updated
    event TaxHandlerChanged(address oldAddress, address newAddress);

    // Event emitted when the tax wallet is updated
    event TaxWalletChanged(address oldAddress, address newAddress);

    // Constructor initializes the token with name, symbol, and owner
    // Also handles token distribution and minting
    constructor(address initialOwner, address taxHandlerAddress, address preservationProjectsVestingContract)
        ERC20("Araracoin", "ARARA") // Initialize the ERC20 token with a name and symbol
        ERC20Permit("Araracoin") // Enable ERC20 Permit functionality for approvals
        Ownable(initialOwner) // Set the owner of the contract
    {
        // Initialize the tax handler with the provided address
        taxHandler = ITaxHandler(taxHandlerAddress);

        // Add address(0) and the initial owner to the whitelist of addresses that can trade before trading is enabled
        _canTrade.add(address(0)); 
        _canTrade.add(initialOwner);

        // Mint the total supply to the deployer of the contract
        _mint(msg.sender, TOTAL_SUPPLY);

        // Distribute the total supply according to the pre-defined percentages
        _transfer(msg.sender, marketingWallet, 3_000_000_000 * 10 ** 18);  // 3% to marketing services
        _transfer(msg.sender, consultingWallet, 1_250_000_000 * 10 ** 18);  // 1.25% to consulting services
        _transfer(msg.sender, auditWallet, 750_000_000 * 10 ** 18);  // 0.75% to audit service
        _transfer(msg.sender, preSaleWallet, TOTAL_SUPPLY * 10 / 100); // 10% to pre-sale
        _transfer(msg.sender, launchWallet, TOTAL_SUPPLY * 20 / 100); // 20% to launch
        _transfer(msg.sender, investorsWallet, 6_250_000_000 * 10 ** 18);  // 6.25% tokens for investors
        _transfer(msg.sender, investorsYearOneVestingWallet, 6_250_000_000 * 10 ** 18);  // 6.25% tokens for investors' year-one vesting
        _transfer(msg.sender, investorsYearTwoVestingWallet, 12_500_000_000 * 10 ** 18);  // 12.5% tokens for investors' year-two vesting
        _transfer(msg.sender, companyVestingWallet, 9_600_000_000 * 10 ** 18);  // 9.6% to comapny vesting
        _transfer(msg.sender, foundersVestingWallet, 5_600_000_000 * 10 ** 18); // 5.6% to founders vesting
        _transfer(msg.sender, teamVestingWallet, 4_800_000_000 * 10 ** 18);  // 4.8% to team vesting
        _transfer(msg.sender, preservationProjectsVestingContract, TOTAL_SUPPLY * 20 / 100); // 20% to preservation projects
    }

    // Function to enable trading, only callable by the owner
    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "AraraCoin trading already enabled"); // Ensure trading hasn't been enabled yet
        tradingEnabled = true; // Set trading to enabled
        emit TradingEnabled(); // Emit event that trading has been enabled
    }

    // Function to update the tax handler contract, only callable by the owner
    function setTaxHandler(address taxHandlerAddress) external onlyOwner {
        address oldTaxHandlerAddress = address(taxHandler); // Store the current tax handler address
        taxHandler = ITaxHandler(taxHandlerAddress); // Set the new tax handler address

        emit TaxHandlerChanged(oldTaxHandlerAddress, taxHandlerAddress); // Emit event with old and new tax handler addresses
    }

    // Function to update the tax wallet address, only callable by the owner
    function setTaxWallet(address taxWalletAddress) external onlyOwner {
        address oldTaxWalletAddress = taxWallet; // Store the current tax wallet address
        taxWallet = taxWalletAddress; // Set the new tax wallet address

        emit TaxWalletChanged(oldTaxWalletAddress, taxWallet); // Emit event with old and new tax wallet addresses
    }

    // Function to add addresses that are allowed to trade before trading is enabled, only callable by the owner
    function addCanTrade(
        address[] calldata allowedAddresses
    ) external onlyOwner {
        require(!tradingEnabled, "AraraCoin trading already enabled"); // Ensure trading isn't enabled yet
        require(allowedAddresses.length != 0, "AraraCoin invalid parameters"); // Ensure there are addresses to add

        // Add each address in the provided list to the set of addresses allowed to trade
        for (uint256 i = 0; i < allowedAddresses.length; i++) {
            _canTrade.add(allowedAddresses[i]);
        }
    }

    // Internal function to handle transfers, with tax calculations
    function _update(address from, address to, uint256 value) 
        internal virtual override(ERC20) 
    {
        // If trading is not yet enabled, ensure the sender is allowed to trade
        if (!tradingEnabled) {
            require(_canTrade.contains(from), "AraraCoin trade is disabled");
        }

        // Calculate the tax based on the sender, receiver, and amount
        uint256 tax = taxHandler.getTax(from, to, value);
        uint256 taxedAmount = value - tax;

        // If there is a tax, transfer the tax amount to the tax wallet
        if (tax > 0) {
            super._update(from, taxWallet, tax);
        }

        // Transfer the remaining amount to the receiver
        super._update(from, to, taxedAmount);
    }
}
