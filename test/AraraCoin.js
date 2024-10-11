const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { parseEther } = require("ethers");

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

const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
const ONE_MONTH_IN_SECS = 30 * 24 * 60 * 60;

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

    const StaticTaxHandler = await ethers.getContractFactory("StaticTaxHandler");
    const staticTaxHandler = await StaticTaxHandler.deploy(owner.address, 0);

    const AraraCoin = await ethers.getContractFactory("AraraCoin");
    const araraCoin = await AraraCoin.deploy(owner.address, await staticTaxHandler.getAddress(), await myVestingWallet.getAddress());    

    return { araraCoin, owner, staticTaxHandler, myVestingWallet };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      expect(await araraCoin.owner()).to.equal(owner.address);
    });

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
      await araraCoin.enableTrading();
      expect(await araraCoin.tradingEnabled()).to.equal(true);
    });

    it("Should allow the owner to set a new tax handler", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);

      // Set a new tax handler and check if it was updated
      await araraCoin.setTaxHandler(taxWallet2);
      expect(await araraCoin.taxHandler()).to.equal(taxWallet2);
    });

    it("Should allow the owner to set a new tax wallet", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);
      // Set a new tax wallet and check if it was updated
      await araraCoin.setTaxWallet(taxWallet);
      expect(await araraCoin.taxWallet()).to.equal(taxWallet);
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
      )).to.be.revertedWith("AraraCoin trade is disabled");
    });

    it("Anyone Should transfer tokens between accounts when Trade is enabled", async function () {
      const { araraCoin } = await loadFixture(deployAraraCoinFixture);

      await araraCoin.enableTrading();

      await araraCoin.connect(await ethers.getSigner(preSaleWallet)).transfer(
        consumerTwo, 50
      );
      const consumerOneBalance = await araraCoin.balanceOf(consumerTwo);
      expect(consumerOneBalance).to.equal(50);
    });

    it("Should apply tax on transfers", async function () {
      const { araraCoin, staticTaxHandler } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const value =  50n * 10n ** decimals;
      const tax = value * 3n / 100n;
      const netValue = value - tax;

      await araraCoin.enableTrading();
      await staticTaxHandler.setTaxPercentage(3_000_000);
      
      const initialLaunchBalance = await araraCoin.balanceOf(launchWallet);
      await araraCoin.connect(await ethers.getSigner(launchWallet)).transfer(
        consumerTwo, value
      );

      expect(await araraCoin.balanceOf(launchWallet)).to.equal(initialLaunchBalance - value);            
      expect(netValue).to.equal(await araraCoin.balanceOf(consumerTwo));      
      expect(tax).to.equal(await araraCoin.balanceOf(taxWallet));
    });

    it("Owner Should be able to change tax wallet", async function () {
      const { araraCoin, staticTaxHandler } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const value =  58n * 10n ** decimals;
      const tax = value * 3n / 100n / 2n;
      const netValue = value - tax;

      await araraCoin.enableTrading();
      await staticTaxHandler.setTaxPercentage(1_500_000);
      await araraCoin.setTaxWallet(taxWallet2);
      
      const initialLaunchBalance = await araraCoin.balanceOf(launchWallet);
      await araraCoin.connect(await ethers.getSigner(launchWallet)).transfer(
        consumerTwo, value
      );
      
      expect(await araraCoin.balanceOf(launchWallet)).to.equal(initialLaunchBalance - value);            
      expect(netValue).to.equal(await araraCoin.balanceOf(consumerTwo));      
      expect(0).to.equal(await araraCoin.balanceOf(taxWallet));
      expect(tax).to.equal(await araraCoin.balanceOf(taxWallet2));
    });
//
    it("Should transfer tokens between accounts when Trade is enabled and not pay tax", async function () {
      const { araraCoin, owner, staticTaxHandler } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const value =  50n * 10n ** decimals;       

      await araraCoin.enableTrading();     
      await araraCoin.setTaxHandler(await staticTaxHandler.getAddress());
      await staticTaxHandler.setTaxPercentage(1_500_000);
      await staticTaxHandler.addExemption(launchWallet);

      const initialLaunchBalance = await araraCoin.balanceOf(launchWallet);
      await araraCoin.connect(await ethers.getSigner(launchWallet)).transfer(
        consumerTwo, value
      );
      
      expect(await araraCoin.balanceOf(launchWallet)).to.equal(initialLaunchBalance - value);            
      expect(value).to.equal(await araraCoin.balanceOf(consumerTwo));      
      expect(0).to.equal(await araraCoin.balanceOf(owner.address));
    });
  });
});