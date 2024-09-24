async function main() {
  const [deployer] = await ethers.getSigners();
  const Bank = await ethers.getContractFactory("MyVestingWallet");
  const bank = await Bank.attach("0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44");

  // Call addMoney function
  let start = await bank.start()  
  console.log(`Start: ${start} `);

  let released = await bank.released()
  console.log(`Released: ${released} `); 
  
  await bank.release()
  
  released = await bank.released()
  console.log(`Released: ${released} `); 
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});