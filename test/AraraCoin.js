const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require("chai");
const { MAX_UINT256, ZERO_ADDRESS } = constants;

const thirdPartyServices = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const preSale = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const initialLaunch = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const investors = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
const teamAndFounders = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
const preservationProjects = "0x976EA74026E726554dB657fA54763abd0C3a0aa9";
const consumerOne = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955";
const consumerTwo = "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f";

describe("AraraCoin", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAraraCoinFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner] = await ethers.getSigners();

    const MyVestingWallet = await ethers.getContractFactory("MyVestingWallet");

    const currentTimestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    const startTimestamp = currentTimestamp + 5; // + 10 sec
    const durationSeconds = 30;
    const cliffSeconds = 10;
    const myVestingWallet = await MyVestingWallet.deploy(teamAndFounders, startTimestamp, durationSeconds, cliffSeconds);

    const ZeroTaxHandler = await ethers.getContractFactory("ZeroTaxHandler");
    const zeroTaxHandler = await ZeroTaxHandler.deploy();

    const StaticTaxHandler = await ethers.getContractFactory("StaticTaxHandler");
    const staticTaxHandler = await StaticTaxHandler.deploy(owner.address, 3);

    const AraraCoin = await ethers.getContractFactory("AraraCoin");
    const araraCoin = await AraraCoin.deploy(owner.address, await zeroTaxHandler.getAddress(), await myVestingWallet.getAddress());    

    return { araraCoin, owner, staticTaxHandler, myVestingWallet };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      expect(await araraCoin.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the correct wallets", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      const ownerBalance = await araraCoin.balanceOf(owner.address);
      expect(ownerBalance).to.equal(0); //await myToken.totalSupply()
    });

    it("Should assign tokens to wallets", async function () {
      const { araraCoin, owner, staticTaxHandler, myVestingWallet } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const TOTAL_SUPPLY = 100_000_000_000n * 10n ** decimals;
      const startTime = Number(await myVestingWallet.start());
      const endTime = Number(await myVestingWallet.end());

      await araraCoin.addCanTrade([await myVestingWallet.getAddress()]);
      
      const thirdPartyServicesBalance = await araraCoin.balanceOf(thirdPartyServices);
      expect(thirdPartyServicesBalance).to.equal(TOTAL_SUPPLY * 5n / 100n);

      const preSaleBalance = await araraCoin.balanceOf(preSale);
      expect(preSaleBalance).to.equal(TOTAL_SUPPLY * 10n / 100n);
    
      const initialLaunchBalance = await araraCoin.balanceOf(initialLaunch);
      expect(initialLaunchBalance).to.equal(TOTAL_SUPPLY * 20n / 100n);

      const investorsBalance = await araraCoin.balanceOf(investors);
      expect(investorsBalance).to.equal(TOTAL_SUPPLY * 25n / 100n);

      const preservationProjectsBalance = await araraCoin.balanceOf(preservationProjects);
      expect(preservationProjectsBalance).to.equal(TOTAL_SUPPLY * 20n / 100n);

      // Vesting Contract
      const araraAddress = await araraCoin.getAddress();
      await myVestingWallet["release(address)"](araraAddress);
      expect(0).to.equal(await araraCoin.balanceOf(teamAndFounders)); //Before Start Should be Zero

      const secondsToStart = startTime - Math.floor(Date.now() / 1000);
      await new Promise(resolve => setTimeout(resolve, (secondsToStart + 2) * 1000));
      await myVestingWallet["release(address)"](araraAddress);
      expect(0).to.equal(await araraCoin.balanceOf(teamAndFounders)); //After Start and before Cliff Should be Zero

      const secondsAfterCliff =  startTime - Math.floor(Date.now() / 1000) + 10;
      await new Promise(resolve => setTimeout(resolve, secondsAfterCliff * 1000));
      await myVestingWallet["release(address)"](araraAddress);
      expect(await araraCoin.balanceOf(teamAndFounders)).to.be.greaterThan(TOTAL_SUPPLY * 6n / 100n); //After Cliff Shouldnt be Zero
      expect(await araraCoin.balanceOf(teamAndFounders)).to.be.lessThanOrEqual(TOTAL_SUPPLY * 10n / 100n);

      const secondsAfterCliff2 =  startTime - Math.floor(Date.now() / 1000) + 20;
      await new Promise(resolve => setTimeout(resolve, secondsAfterCliff2 * 1000));
      await myVestingWallet["release(address)"](araraAddress);
      expect(await araraCoin.balanceOf(teamAndFounders)).to.be.greaterThan(TOTAL_SUPPLY * 13n / 100n); //After Cliff Shouldnt be Zero
      expect(await araraCoin.balanceOf(teamAndFounders)).to.be.lessThanOrEqual(TOTAL_SUPPLY * 16n / 100n);

      const afterEnd =  endTime - Math.floor(Date.now() / 1000);
      await new Promise(resolve => setTimeout(resolve, afterEnd * 1000));
      await myVestingWallet["release(address)"](araraAddress);
      expect(await araraCoin.balanceOf(teamAndFounders)).to.equal(TOTAL_SUPPLY * 20n / 100n); //TOTAL_SUPPLY * 20n / 100n
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts from allowed account", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);

      await araraCoin.addCanTrade([preSale]);

      await araraCoin.connect(await ethers.getSigner(preSale)).transfer(
        consumerOne, 50
      );
      const consumerOneBalance = await araraCoin.balanceOf(consumerOne);
      expect(consumerOneBalance).to.equal(50);
    });

    it("Should not transfer tokens between accounts from not allowed account", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);
      
      await expect(araraCoin.connect(await ethers.getSigner(initialLaunch)).transfer(
        consumerOne, 50
      )).to.be.revertedWith("AraraCoin trade is disabled");
    });

    it("Anyone Should transfer tokens between accounts when Trade is enabled", async function () {
      const { araraCoin, owner } = await loadFixture(deployAraraCoinFixture);

      await araraCoin.enableTrading();

      await araraCoin.connect(await ethers.getSigner(preSale)).transfer(
        consumerTwo, 50
      );
      const consumerOneBalance = await araraCoin.balanceOf(consumerTwo);
      expect(consumerOneBalance).to.equal(50);
    });

    it("Anyone Should transfer tokens between accounts when Trade is enabled and pay", async function () {
      const { araraCoin, owner, staticTaxHandler } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const value =  50n * 10n ** decimals;
      const tax = value * 3n / 100n;
      const netValue = value - tax;           

      await araraCoin.enableTrading();     
      await araraCoin.setTaxHandler(await staticTaxHandler.getAddress());
      
      const initialLaunchBalance = await araraCoin.balanceOf(initialLaunch);
      await araraCoin.connect(await ethers.getSigner(initialLaunch)).transfer(
        consumerTwo, value
      );
      
      expect(await araraCoin.balanceOf(initialLaunch)).to.equal(initialLaunchBalance - value);            
      expect(netValue).to.equal(await araraCoin.balanceOf(consumerTwo));      
      expect(tax).to.equal(await araraCoin.balanceOf(owner.address));
    });

    it("Should transfer tokens between accounts when Trade is enabled and not pay tax", async function () {
      const { araraCoin, owner, staticTaxHandler } = await loadFixture(deployAraraCoinFixture);
      const decimals = await araraCoin.decimals();
      const value =  50n * 10n ** decimals;       

      await araraCoin.enableTrading();     
      await araraCoin.setTaxHandler(await staticTaxHandler.getAddress());
      await staticTaxHandler.addExemption(initialLaunch);

      const initialLaunchBalance = await araraCoin.balanceOf(initialLaunch);
      await araraCoin.connect(await ethers.getSigner(initialLaunch)).transfer(
        consumerTwo, value
      );
      
      expect(await araraCoin.balanceOf(initialLaunch)).to.equal(initialLaunchBalance - value);            
      expect(value).to.equal(await araraCoin.balanceOf(consumerTwo));      
      expect(0).to.equal(await araraCoin.balanceOf(owner.address));
    });
  


    // it("Should fail if sender doesn’t have enough tokens", async function () {
    //   const initialOwnerBalance = await myToken.balanceOf(owner.address);

    //   await expect(
    //     myToken.connect(addr1).transfer(owner.address, 1)
    //   ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

    //   expect(await myToken.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    // });

    // it("Should update balances after transfers", async function () {
    //   const initialOwnerBalance = await myToken.balanceOf(owner.address);

    //   await myToken.transfer(addr1.address, 100);
    //   await myToken.transfer(addr2.address, 50);

    //   const finalOwnerBalance = await myToken.balanceOf(owner.address);
    //   expect(finalOwnerBalance).to.equal(initialOwnerBalance - 150);

    //   const addr1Balance = await myToken.balanceOf(addr1.address);
    //   expect(addr1Balance).to.equal(100);

    //   const addr2Balance = await myToken.balanceOf(addr2.address);
    //   expect(addr2Balance).to.equal(50);
    // });
  });



});