// SPDX-License-Identifier: MIT
// This contract is compatible with OpenZeppelin Contracts version ^5.0.0
pragma solidity ^0.8.20;

// Importing OpenZeppelin libraries for ERC20, ERC20Permit, and Ownable functionality
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// The main contract for the AraraCoin token
contract AraraCoin is ERC20, ERC20Permit, AccessControl {
    // Defining a role for managers who will have special permissions      
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    // Denominator for tax calculations for more precise percentages
    uint256 private constant FEE_DENOMINATOR = 10_000; // For 0.0001% precision

    // Addresses used for initial token distribution
    address private constant marketingWallet = 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f;
    address private constant consultingWallet = 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720;
    address private constant auditWallet = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address private constant preSaleWallet = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address private constant launchWallet = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
    address private constant investorsWallet = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;
    address private constant investorsYearOneVestingWallet = 0x71bE63f3384f5fb98995898A86B02Fb2426c5788;
    address private constant investorsYearTwoVestingWallet = 0xFABB0ac9d68B0B445fB7357272Ff202C5651694a;
    address private constant teamVestingWallet = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc;
    address private constant foundersVestingWallet = 0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec;
    address private constant companyVestingWallet = 0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097;
    address private constant preservationProjectsVestingWallet = 0x976EA74026E726554dB657fA54763abd0C3a0aa9;

    // Manager wallet addresses for management roles
    address private managerWallet1;
    address private constant managerWallet2 = 0xBcd4042DE499D14e55001CcbB24a551F3b954096;
    address private constant managerWallet3 = 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955;
    
    // Total supply of the token, set at 100 billion tokens, with 18 decimals
    uint256 private constant TOTAL_SUPPLY = 100_000_000_000 * 10 ** 18;
    
    // Address where tax funds will be sent
    address public taxWallet = 0xbDA5747bFD65F08deb54cb465eB87D40e51B197E;

    // A boolean that indicates whether trading has been enabled
    bool public tradingEnabled;
    
    // A set of addresses that are allowed to trade before trading is officially enabled
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private _canTrade;

    // A set of addresses that are exempted from paying tax
    EnumerableSet.AddressSet private _exempted;
    uint256 public taxPercentage;

    // Event emitted when trading is enabled
    event TradingEnabled();
    // Emitted when the tax is updated.
    event TaxPercentageUpdated(uint256 oldTaxPercentage, uint256 newTaxPercentage);
    // Emitted when an address is added to or removed from the exempted addresses set.
    event TaxExemptionUpdated(address indexed wallet, bool exempted);
    // Event emitted when the tax wallet is updated
    event TaxWalletChanged(address oldAddress, address newAddress);

    // Track approvals, expiration times, and which addresses have approved
    struct ApprovalInfo {
        uint256 count;
        uint256 expiration;
        mapping(address => bool) approvedBy; // Track which addresses have approved
    }    
    mapping(bytes32 => ApprovalInfo) private _approvals;

    // Required number of approvals and approval expiration time in seconds
    uint256 private constant _requiredApprovals = 3;
    uint256 private constant _approvalExpirationTime = 3600;

    // Constructor initializes the token with name, symbol, and owner
    // Also handles token distribution and minting
    constructor(address defaultAdmin, address preservationProjectsVestingContract)
        ERC20("Araracoin", "ARARA") // Initialize the ERC20 token with a name and symbol
        ERC20Permit("Araracoin") // Enable ERC20 Permit functionality for approvals        
    {
        // Setup admin role and approvers
        managerWallet1 = defaultAdmin;
        _grantRole(MANAGER_ROLE, managerWallet1);
        _grantRole(MANAGER_ROLE, managerWallet2);
        _grantRole(MANAGER_ROLE, managerWallet3);

        taxPercentage = 0; // Set initial tax percentage to 0

        // Add address(0) and the initial owner to the whitelist of addresses that can trade before trading is enabled
        _canTrade.add(address(0)); 
        _canTrade.add(defaultAdmin);

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
    // Private function to reset approvals if expired
    function _resetApprovalIfExpired(bytes32 txHash) private {
        ApprovalInfo storage approval = _approvals[txHash];
        if (approval.expiration > 0 && block.timestamp > approval.expiration) {
            approval.count = 0;
            approval.expiration = 0;
            delete approval.approvedBy[managerWallet1];
            delete approval.approvedBy[managerWallet2];
            delete approval.approvedBy[managerWallet3];
        }
    }
    // Private function to process a new approval
    function _processApproval(bytes32 txHash) private {
        _resetApprovalIfExpired(txHash);
        require(!_approvals[txHash].approvedBy[msg.sender], "AraraCoin: You have already approved this transaction.");
        ApprovalInfo storage approval = _approvals[txHash];
        approval.approvedBy[msg.sender] = true;
        approval.count += 1;
        approval.expiration = block.timestamp + _approvalExpirationTime;
    }

    // Function to enable trading, requires approval from multiple managers
    function enableTrading() public onlyRole(MANAGER_ROLE) {
        require(!tradingEnabled, "AraraCoin: trading already enabled"); // Ensure trading hasn't been enabled yet

        bytes32 txHash = keccak256(abi.encodePacked("EnableTrading"));
        // Check if previous approvals have expired
        _processApproval(txHash);
        
        if (_approvals[txHash].count >= _requiredApprovals) {
            tradingEnabled = true; // Set trading to enabled
            emit TradingEnabled(); // Emit event that trading has been enabled
        } 
    }

    // Function to set the tax percentage, requires approval from multiple managers
    function setTaxPercentage(uint256 newTaxPercentage) public onlyRole(MANAGER_ROLE) {
        //  Max 1% = 100 basis points, 0.01% = 1 basis points
        require(newTaxPercentage >= 0 && newTaxPercentage <= 100, "AraraCoin: Tax percentage must be between 0 and 100 basis points (max 1%).");
        require(taxPercentage != newTaxPercentage, "AraraCoin: New tax percentage must be different from the current value.");
        
        bytes32 txHash = keccak256(abi.encodePacked("NewTax", newTaxPercentage));
        _processApproval(txHash);

        if (_approvals[txHash].count >= _requiredApprovals) {
            uint256 oldTaxPercentage = taxPercentage;
            taxPercentage = newTaxPercentage;

            emit TaxPercentageUpdated(oldTaxPercentage, newTaxPercentage);
        }
    }

    // Function to update the tax wallet address, requires approval from multiple managers
    function setTaxWallet(address taxWalletAddress) public onlyRole(MANAGER_ROLE) {
        bytes32 txHash = keccak256(abi.encodePacked("TaxWallet", taxWalletAddress));
        // Check if previous approvals have expired
        _processApproval(txHash);

        if (_approvals[txHash].count >= _requiredApprovals) {
            address oldTaxWalletAddress = taxWallet; // Store the current tax wallet address
            taxWallet = taxWalletAddress; // Set the new tax wallet address

            emit TaxWalletChanged(oldTaxWalletAddress, taxWallet); // Emit event with old and new tax wallet addresses
        }
    }
    // Add an address to the exempted set, preventing it from paying taxes
    function addExemption(address exemption) public onlyRole(MANAGER_ROLE) {
        require(_exempted.add(exemption), "AraraCoin: Address already exists in the exemptions");

        emit TaxExemptionUpdated(exemption, true);        
    }
    // Remove an address from the exempted set, making it taxable
    function removeExemption(address exemption) public onlyRole(MANAGER_ROLE) {
        require(_exempted.remove(exemption), "AraraCoin: Address not found in the exemptions");

        emit TaxExemptionUpdated(exemption, false);
    }

    // Function to add addresses that are allowed to trade before trading is enabled, only callable by the managers
    function addCanTrade(
        address[] calldata allowedAddresses
    ) public onlyRole(MANAGER_ROLE) {
        require(!tradingEnabled, "AraraCoin: Trading already enabled"); // Ensure trading isn't enabled yet
        require(allowedAddresses.length != 0, "AraraCoin: List of allowed addresses cannot be empty."); // Ensure there are addresses to add

        // Add each address in the provided list to the set of addresses allowed to trade
        for (uint256 i = 0; i < allowedAddresses.length; i++) {
            _canTrade.add(allowedAddresses[i]);
        }
    }
    
    // Function to remove addresses from the list of allowed traders before trading is enabled, only callable by the managers
    function removeCanTrade(
        address[] calldata allowedAddresses
    ) public onlyRole(MANAGER_ROLE) {
        require(!tradingEnabled, "AraraCoin: Trading already enabled"); // Ensure trading isn't enabled yet
        require(allowedAddresses.length != 0, "AraraCoin: List of allowed addresses cannot be empty."); // Ensure there are addresses to add

        // Add each address in the provided list to the set of addresses allowed to trade
        for (uint256 i = 0; i < allowedAddresses.length; i++) {
            _canTrade.remove(allowedAddresses[i]);
        }
    }

    // Internal function to handle transfers, with tax calculations
    function _update(address from, address to, uint256 value) 
        internal virtual override(ERC20) 
    {
        // If trading is not yet enabled, ensure the sender is allowed to trade
        if (!tradingEnabled) {
            require(_canTrade.contains(from), "AraraCoin: Trade is disabled");
        }

        // Calculate the tax based on the sender, receiver, and amount
        uint256 tax = _getTax(from, to, value);
        uint256 taxedAmount = value - tax;

        // If there is a tax, transfer the tax amount to the tax wallet
        if (tax > 0) {
            super._update(from, taxWallet, tax);
        }

        // Transfer the remaining amount to the receiver
        super._update(from, to, taxedAmount);
    }

    // Private function to get the tax amount based on exemption rules and tax percentage
    function _getTax(
        address benefactor,
        address beneficiary,
        uint256 amount
    ) private view returns (uint256) {
        // If the sender or receiver is exempted, return zero tax
        if (_exempted.contains(benefactor) || _exempted.contains(beneficiary)) {
            return 0;
        }
        
        // Otherwise, calculate the tax as a percentage of the amount
        return amount * taxPercentage / FEE_DENOMINATOR;
    }
}
