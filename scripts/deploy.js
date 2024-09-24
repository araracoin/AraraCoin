// scripts/deploy.js
async function main () {
  const [owner, otherAccount] = await ethers.getSigners();
  // We get the contract to deploy
  const Box = await ethers.getContractFactory('AraraCoin');
  console.log('Deploying Box...');
  // const box = await Box.deploy("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 
  //   Math.floor(Date.now() / 1000) + 600,
  const box = await Box.deploy(owner);
  await box.waitForDeployment();
  console.log('Box deployed to:', await box.getAddress());
  console.log(box);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });