async function main() {
  const [deployer] = await ethers.getSigners();
  const Bank = await ethers.getContractFactory("VestingWallet");
  const bank = await Bank.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");

  bank.on("EtherReleased", (amount) => {
      console.log(`EtherReleased: ${ethers.utils.formatEther(amount)} ETH`);
  });

  bank.on("ERC20Released", (token, amount) => {
      console.log(`ERC20Released: ${ethers.utils.formatEther(amount)} ETH`);
      console.log(`ERC20Released token: ${token}`);
  });

  console.log("Listening for events...");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

