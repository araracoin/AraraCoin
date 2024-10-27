const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { parseEther, keccak256, toUtf8Bytes } = require("ethers");

const marketingWallet = "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f";
const consultingWallet = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";
const auditWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const preSaleWallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const launchWallet = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const investorsWallet = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
const investorsYearOneVestingWallet = "0x71bE63f3384f5fb98995898A86B02Fb2426c5788";
const investorsYearTwoVestingWallet = "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a";
const teamVestingWallet = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
const foundersVestingWallet = "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec";
const companyVestingWallet = "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097";
const preservationProjectsVestingWallet = "0x976EA74026E726554dB657fA54763abd0C3a0aa9";

const taxWallet = "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E";
const taxWallet2 = "0xdD2FD4581271e230360230F9337D5c0430Bf44C0";

const consumerOne = "0x2546BcD3c84621e976D8185a91A922aE77ECEc30";
const consumerTwo = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";

const managerWallet1 = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955";
const managerWallet2 = "0xBcd4042DE499D14e55001CcbB24a551F3b954096";
const managerWallet3 = "0xcd3B766CCDd6AE721141F452C550Ca635964ce71";

const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
const ONE_MONTH_IN_SECS = 30 * 24 * 60 * 60;

const MANAGER_ROLE = keccak256(toUtf8Bytes("MANAGER_ROLE"));

describe("AraraCoin", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAraraCoinFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner] = await ethers.getSigners();

    const MyVestingWallet = await ethers.getContractFactory("MyVestingWallet");

    const startDate = Math.floor(new Date(2024,10,1, 0, 0, 0) / 1000);
    const cliffFinishes = Math.floor(new Date(2025,0,1, 0, 0, 0) / 1000);
    const endDate = Math.floor(new Date(2025,10,1, 0, 0, 0) / 1000);
    
    const durationSeconds = endDate - startDate; 
    const cliffSeconds = cliffFinishes - startDate; 
    const myVestingWallet = await MyVestingWallet.deploy(preservationProjectsVestingWallet, startDate, durationSeconds, cliffSeconds);

    const AraraCoin = await ethers.getContractFactory("AraraCoin");
    const araraCoin = await AraraCoin.deploy(owner.address, await myVestingWallet.getAddress());

    return { araraCoin, owner, myVestingWallet };
  }
  async function enableTrade(araraCoin) {
    await araraCoin.connect(await ethers.getSigner(managerWallet1)).enableTrading();
    await araraCoin.connect(await ethers.getSigner(managerWallet2)).enableTrading();
    return await araraCoin.enableTrading();
  }
  async function setTaxPercentage(araraCoin, percentage) {
    await araraCoin.connect(await ethers.getSigner(managerWallet1)).setTaxPercentage(percentage);        
    await araraCoin.connect(await ethers.getSigner(managerWallet2)).setTaxPercentage(percentage);
    return await araraCoin.setTaxPercentage(percentage);
  }
  async function setTaxWallet(araraCoin, taxWallet) {
    await araraCoin.connect(await ethers.getSigner(managerWallet1)).setTaxWallet(taxWallet);
    await araraCoin.connect(await ethers.getSigner(managerWallet2)).setTaxWallet(taxWallet);
    await araraCoin.setTaxWallet(taxWallet);
  }
  describe("Deployment", function () {    
    it("Should deploy with correct total supply and balances", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      const ownerBalance = await araraCoin.balanceOf(owner.address);
      expect(ownerBalance).to.equal(0);
    });

    it("Should release tokens correctly from vesting", async function () {
      const { araraCoin, owner, staticTaxHandler, myVestingWallet } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const TOTAL_SUPPLY = 100_000_000_000n * 10n ** decimals;
      const araraAddress = await araraCoin.getAddress();
      
      await araraCoin.addCanTrade([await myVestingWallet.getAddress()]);
      
       // Pre-sale: 10%
      expect(await araraCoin.balanceOf(preSaleWallet)).to.equal(parseEther("10000000000")); // 10 billion tokens

      // Initial launch: 20%
      expect(await araraCoin.balanceOf(launchWallet)).to.equal(parseEther("20000000000")); // 20 billion tokens

      // Preservation projects: 20%
      const vestingEnd = await myVestingWallet.end();      
      const balance = await myVestingWallet["vestedAmount(address, uint64)"](araraAddress, vestingEnd);      
      expect(balance).to.equal(parseEther("20000000000")); // 20 billion tokens  

      // Investors: 6.25 billion tokens
      expect(await araraCoin.balanceOf(investorsWallet)).to.equal(parseEther("6250000000"));

      // Investors Year One Vesting: 6.25 billion tokens
      expect(await araraCoin.balanceOf(investorsYearOneVestingWallet)).to.equal(parseEther("6250000000"));

      // Investors Year Two Vesting: 12.5 billion tokens
      expect(await araraCoin.balanceOf(investorsYearTwoVestingWallet)).to.equal(parseEther("12500000000"));

      // Team vesting: 4.8 billion tokens
      expect(await araraCoin.balanceOf(teamVestingWallet)).to.equal(parseEther("4800000000"));

      // Founders vesting: 5.6 billion tokens
      expect(await araraCoin.balanceOf(foundersVestingWallet)).to.equal(parseEther("5600000000"));
  
      // Company vesting: 9.6 billion tokens
      expect(await araraCoin.balanceOf(companyVestingWallet)).to.equal(parseEther("9600000000"));
      
      // Marketing: 3 billion tokens
      expect(await araraCoin.balanceOf(marketingWallet)).to.equal(parseEther("3000000000"));

      // Consulting: 1.25 billion tokens
      expect(await araraCoin.balanceOf(consultingWallet)).to.equal(parseEther("1250000000"));

      // Audit: 0.75 billion tokens
      expect(await araraCoin.balanceOf(auditWallet)).to.equal(parseEther("750000000"));
    });

    it("Should release tokens correctly from vesting", async function () {
      const { araraCoin, myVestingWallet } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const TOTAL_SUPPLY = 100_000_000_000n * 10n ** decimals;
      const araraAddress = await araraCoin.getAddress();
      
      await araraCoin.addCanTrade([await myVestingWallet.getAddress()]);
      
      await myVestingWallet["release(address)"](araraAddress);
      expect(0).to.equal(await araraCoin.balanceOf(preservationProjectsVestingWallet)); //Before Start Should be Zero

      const cliffFinishes = Math.floor(new Date(2025,0,1, 0, 0, 0) / 1000);
      const beforeCliff = cliffFinishes - (await time.latest()) - 300;
      await time.increase(beforeCliff);
      await myVestingWallet["release(address)"](araraAddress);
      expect(0).to.equal(await araraCoin.balanceOf(preservationProjectsVestingWallet)); //After Start and before Cliff Should be Zero

      const cliffTime = cliffFinishes - (await time.latest());
      await time.increase(cliffTime);      
      await myVestingWallet["release(address)"](araraAddress);
      expect(await araraCoin.balanceOf(preservationProjectsVestingWallet))
        .to.be.greaterThan(TOTAL_SUPPLY * 3n / 100n)
        .and.lessThanOrEqual(TOTAL_SUPPLY * 4n / 100n); //After Cliff Shouldnt be Zero

      await time.increase(ONE_MONTH_IN_SECS * 2);
      await myVestingWallet["release(address)"](araraAddress);
      expect(await araraCoin.balanceOf(preservationProjectsVestingWallet))
        .to.be.greaterThan(TOTAL_SUPPLY * 6n / 100n)
        .and.lessThanOrEqual(TOTAL_SUPPLY * 7n / 100n);; //After Cliff Shouldnt be Zero

      await time.increase(ONE_MONTH_IN_SECS * 9);
      await myVestingWallet["release(address)"](araraAddress);
      expect(await araraCoin.balanceOf(preservationProjectsVestingWallet)).to.equal(TOTAL_SUPPLY * 20n / 100n); //TOTAL_SUPPLY * 20n / 100n
    });

    it("Should allow the owner to enable trading", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);

      // Ensure trading is disabled initially      
      expect(await araraCoin.tradingEnabled()).to.equal(false);

      // Enable trading
      await enableTrade(araraCoin);
      
      expect(await araraCoin.tradingEnabled()).to.equal(true);
    });

    it("should not allow setting tax percentage above 1%", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);
      
      await expect(setTaxPercentage(araraCoin, 101)) // 1.01% or 101 basis points
        .to.be.revertedWith("AraraCoin: Tax percentage must be between 0 and 100 basis points (max 1%).");
    });

    it("should not allow non-admin to add or revoke roles", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      const randomUser = await ethers.getSigner(consumerOne);
    
      // Attempt to add a role using an unauthorized user
      await expect(araraCoin.connect(randomUser).grantRole(MANAGER_ROLE, randomUser.address))
        .to.be.reverted;
    
      // Attempt to revoke a role using an unauthorized user
      await expect(araraCoin.connect(randomUser).revokeRole(MANAGER_ROLE, owner.address))
        .to.be.reverted;
    });

    it("should restrict trading for removed whitelisted addresses", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);
    
      // Add address to whitelist and allow trading
      await araraCoin.addCanTrade([preSaleWallet]);
      await araraCoin.connect(await ethers.getSigner(preSaleWallet)).transfer(consumerOne, 50);
      
      // Now remove from whitelist
      await araraCoin.removeCanTrade([preSaleWallet]);
    
      // Attempt to trade again should revert
      await expect(
        araraCoin.connect(await ethers.getSigner(preSaleWallet)).transfer(consumerOne, 50)
      ).to.be.revertedWith("AraraCoin: Trade is disabled");
    });

    it("Should allow the owner to set a new tax wallet", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      expect(await araraCoin.taxWallet()).to.not.equal(taxWallet2);
      // Set a new tax wallet and check if it was updated
      await araraCoin.connect(await ethers.getSigner(managerWallet1)).setTaxWallet(taxWallet2);
      await araraCoin.connect(await ethers.getSigner(managerWallet2)).setTaxWallet(taxWallet2);
      await araraCoin.connect(owner).setTaxWallet(taxWallet2);
      expect(await araraCoin.taxWallet()).to.equal(taxWallet2);
    });

    it("should deploy and assign roles correctly", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      expect(await araraCoin.hasRole(await araraCoin.MANAGER_ROLE(), owner.address)).to.be.true;
      expect(await araraCoin.hasRole(await araraCoin.MANAGER_ROLE(), managerWallet1)).to.be.true;
      expect(await araraCoin.hasRole(await araraCoin.MANAGER_ROLE(), managerWallet2)).to.be.true;
    });

    it("should enable trading after required approvals", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);

      await araraCoin.connect(await ethers.getSigner(managerWallet1)).enableTrading();
      await araraCoin.connect(await ethers.getSigner(managerWallet2)).enableTrading()
      expect(await araraCoin.tradingEnabled()).to.be.false;
      await araraCoin.connect(owner).enableTrading();
  
      expect(await araraCoin.tradingEnabled()).to.be.true;
    });

    // it("should update tax handler after required approvals", async function () {
    //   const { araraCoin, owner,  staticTaxHandler, newStaticTaxHandler} = await loadFixture(deployAraraCoinFixture);
      
    //   const oldAddress = await staticTaxHandler.getAddress();
    //   const newAddress = await newStaticTaxHandler.getAddress();

    //   expect(await araraCoin.taxHandler()).to.equal(oldAddress);

    //   await araraCoin.connect(await ethers.getSigner(managerWallet1)).setTaxHandler(newAddress);
    //   await araraCoin.connect(await ethers.getSigner(managerWallet2)).setTaxHandler(newAddress);
    //   await araraCoin.connect(owner).setTaxHandler(newAddress);
  
    //   expect(await araraCoin.taxHandler()).to.equal(newAddress);
    // });

    it("should not allow multiple approvals from the same manager", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);
      const manager1 = await ethers.getSigner(managerWallet1);
      await araraCoin.connect(manager1).enableTrading();
      await expect(araraCoin.connect(manager1).enableTrading())
        .to.be.revertedWith("AraraCoin: You have already approved this transaction.");
    });

    it("should reset approvals after expiration", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      const manager1 = await ethers.getSigner(managerWallet1);
      const manager2 = await ethers.getSigner(managerWallet2);

      await araraCoin.connect(manager1).enableTrading();
      await time.increase(3600);
  
      await araraCoin.connect(manager1).enableTrading();
      await araraCoin.connect(manager2).enableTrading();
      await araraCoin.connect(owner).enableTrading();
  
      // expect(await araraCoin.tradingEnabled()).to.be.true;
    });

    it("should measure gas costs for enableTrading", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      const tx = await araraCoin.connect(owner).enableTrading();
      const receipt = await tx.wait();
  
      console.log("Gas used for enableTrading:", receipt.gasUsed.toString());
    });

    it("should emit events correctly", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      await expect(enableTrade(araraCoin))
        .to.emit(araraCoin, "TradingEnabled");
    });
  });

  describe("Transactions", function () {
    it("Should allow specific addresses to trade before trading is enabled", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);

      await araraCoin.addCanTrade([preSaleWallet]);

      await araraCoin.connect(await ethers.getSigner(preSaleWallet)).transfer(
        consumerOne, 50
      );
      const consumerOneBalance = await araraCoin.balanceOf(consumerOne);
      expect(consumerOneBalance).to.equal(50);
    });

    it("Should restrict trading before trading is enabled", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);
      
      await expect(araraCoin.connect(await ethers.getSigner(launchWallet)).transfer(
        consumerOne, 50
      )).to.be.revertedWith("AraraCoin: Trade is disabled");
    });

    it("Anyone Should transfer tokens between accounts when Trade is enabled", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);

      await enableTrade(araraCoin);

      await araraCoin.connect(await ethers.getSigner(preSaleWallet)).transfer(
        consumerTwo, 50
      );
      const consumerOneBalance = await araraCoin.balanceOf(consumerTwo);
      expect(consumerOneBalance).to.equal(50);
    });

    it("Should apply tax on transfers", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const value =  50n * 10n ** decimals;
      const tax = value * 1n / 100n;
      const netValue = value - tax


      expect(await araraCoin.taxPercentage()).to.equal(0);
      // Enable trading
      await enableTrade(araraCoin);
      await setTaxPercentage(araraCoin, 100); // 1%
      expect(await araraCoin.taxPercentage()).to.equal(100);
      
      const initialLaunchBalance = await araraCoin.balanceOf(launchWallet);
      await araraCoin.connect(await ethers.getSigner(launchWallet)).transfer(
        consumerTwo, value
      );

      expect(await araraCoin.balanceOf(launchWallet)).to.equal(initialLaunchBalance - value);
      expect(netValue).to.equal(await araraCoin.balanceOf(consumerTwo));
      expect(tax).to.equal(await araraCoin.balanceOf(taxWallet));
    });

    it("should not allow trading before enabled", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);
      await expect(araraCoin.connect(await ethers.getSigner(auditWallet)).transfer(consumerOne, 100))
        .to.be.revertedWith("AraraCoin: Trade is disabled");
    });

    it("should allow whitelisted addresses to trade before trading is enabled", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      await araraCoin.connect(owner).addCanTrade([auditWallet]);
      await expect(araraCoin.connect(await ethers.getSigner(auditWallet)).transfer(consumerOne, 100)).to.not.be.reverted;
    });
  
    it("Owner Should be able to change tax wallet", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const value =  58n * 10n ** decimals;
      const tax = value * 1n / 100n / 2n;
      const netValue = value - tax;

      await enableTrade(araraCoin);
      await setTaxPercentage(araraCoin, 50); //0.5%
      
      await setTaxWallet(araraCoin, taxWallet2);
      
      const initialLaunchBalance = await araraCoin.balanceOf(launchWallet);
      await araraCoin.connect(await ethers.getSigner(launchWallet)).transfer(
        consumerTwo, value
      );
      
      expect(await araraCoin.balanceOf(launchWallet)).to.equal(initialLaunchBalance - value);
      expect(netValue).to.equal(await araraCoin.balanceOf(consumerTwo));
      expect(0).to.equal(await araraCoin.balanceOf(taxWallet));
      expect(tax).to.equal(await araraCoin.balanceOf(taxWallet2));
    });

    it("Should transfer tokens between accounts when Trade is enabled and not pay tax", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const value =  50n * 10n ** decimals;

      await enableTrade(araraCoin);
      await setTaxPercentage(araraCoin, 50); //0.5%
      await araraCoin.addExemption(launchWallet);

      const initialLaunchBalance = await araraCoin.balanceOf(launchWallet);
      await araraCoin.connect(await ethers.getSigner(launchWallet)).transfer(
        consumerTwo, value
      );
      
      expect(await araraCoin.balanceOf(launchWallet)).to.equal(initialLaunchBalance - value);
      expect(value).to.equal(await araraCoin.balanceOf(consumerTwo));
      expect(0).to.equal(await araraCoin.balanceOf(owner.address));
    });

    it("Should transfer tokens between accounts when Trade is enabled and pay tax when removed from exemption", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const value =  50n * 10n ** decimals;

      await enableTrade(araraCoin);        
      await setTaxPercentage(araraCoin, 50); //0.5%
      
      expect(taxWallet).to.equal(await araraCoin.taxWallet());
      await araraCoin.addExemption(launchWallet);
      await araraCoin.connect(await ethers.getSigner(launchWallet)).transfer(
        consumerTwo, value
      );  
      expect(0).to.equal(await araraCoin.balanceOf(taxWallet));

      await araraCoin.removeExemption(launchWallet);
      await araraCoin.connect(await ethers.getSigner(launchWallet)).transfer(
        consumerTwo, value
      );
      expect(0).not.to.equal(await araraCoin.balanceOf(taxWallet));
    });
  });
});