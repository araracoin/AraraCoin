// SPDX-License-Identifier: MIT
// This contract is compatible with OpenZeppelin Contracts version ^5.0.0
pragma solidity 0.8.24;

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
    address private constant marketingWallet = 0x4Ac1dD9A136eb8909D65496555f48f48AC93068b;
    address private constant consultingWallet = 0xC57C81e3782274770094DEdFcfd406e8921A1Bad;
    address private constant auditWallet = 0x6E76a5E0E1D803F61CDBADD8133d3Ba0fBf340fB;
    address private constant preSaleWallet = 0x511Cd5F2A3343fd62f5d0B50A09398b22991B099;
    address private constant launchWallet = 0x3Fc60ef3e66c8b4BE6A6FD7b5638946B9F73cd4F;
    address private constant investorsWallet = 0x2D9C08B659AdE495946b535E257AfF836348F4b6;
    address private constant investorsYearOneVestingWallet = 0x5EdD8A9fD3dD7be76021Ee0D9c1fD4a0a3e1E0cE;
    address private constant investorsYearTwoVestingWallet = 0x55EeEE4b21B4C4f7B483c877e0EcA591192E7946;
    address private constant teamVestingWallet = 0xe8fA8c30340ABaBC4f1fc5CCe13200b13F1BceF3;
    address private constant foundersVestingWallet = 0x14B268F8c98135860d32d8f8A5EE71eC8585E45C;
    address private constant companyVestingWallet = 0x8221DE574E5aA63B28990d5DC758B67E0e5A864C;
    address private constant preservationProjectsVestingWallet = 0xA7072f57E6B14043C8a457f192Be824EDa6DDb46;

    // Manager wallet addresses for management roles
    address private constant managerWallet1 = 0xd24194E8b58b2C2602850BfDcE5d1B7d40529fe8;
    address private constant managerWallet2 = 0xeE449C1Fcd61Cf8f97cD2D1c4B001FEb8d284CB0;
    address private constant managerWallet3 = 0x12EaeAB21aA5d484463292B47657815211236d0b;
    address private constant managerWallet4 = 0x50E93B660168aD1FF984aAB55143B1ad5e1a4313;
    address private constant managerWallet5 = 0xa788b94fC0DEdADB4D8af310C34Ab6694c8BBB20;
    
    // Total supply of the token, set at 100 billion tokens, with 18 decimals
    uint256 private constant TOTAL_SUPPLY = 100_000_000_000 * 10 ** 18;
    
    // Address where tax funds will be sent
    address public taxWallet = 0x1028C019315Ae92c826E778Eeb2a098cF8379B4C;

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
    constructor()
        ERC20("Araracoin", "ARARA") // Initialize the ERC20 token with a name and symbol
        ERC20Permit("Araracoin") // Enable ERC20 Permit functionality for approvals        
    {
        // Setup admin role and approvers
        _grantRole(MANAGER_ROLE, managerWallet1);
        _grantRole(MANAGER_ROLE, managerWallet2);
        _grantRole(MANAGER_ROLE, managerWallet3);
        _grantRole(MANAGER_ROLE, managerWallet4);
        _grantRole(MANAGER_ROLE, managerWallet5);

        taxPercentage = 0; // Set initial tax percentage to 0

        // Add address(0) and the initial owner to the whitelist of addresses that can trade before trading is enabled
        _canTrade.add(address(0)); 
        _canTrade.add(managerWallet1);

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
        _transfer(msg.sender, preservationProjectsVestingWallet, TOTAL_SUPPLY * 20 / 100); // 20% to preservation projects
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
            delete approval.approvedBy[managerWallet4];
            delete approval.approvedBy[managerWallet5];
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
        require(taxWalletAddress != address(0), "Tax wallet address cannot be zero");

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
