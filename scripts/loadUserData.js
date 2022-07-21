const { getNamedAccounts, ethers } = require("hardhat");
const data = require("../build/output.json");

async function main() {
  for (let index = 0; index < data.length; index++) {
    // if (parseFloat(data[index].amount) > 1) {
    const account = data[index].from;
    // console.log("Account: ", account);
    // LendingPoolAddressesProvider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const lendingPool = await getLendingPool(data[index].from);
    await getBorrowUserData(lendingPool, account);

    // console.log(`LendingPool address ${lendingPool.address}`);

    // }
  }
}

async function getLendingPool(account) {
  // const lendingPoolAddressesProvider = await ethers.getContractAt(
  //   "ILendingPoolAddressesProvider",
  //   "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5", // weth contract address
  //   account
  // );

  // const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", // WETH
    account
  );
  return lendingPool;
}

async function getBorrowUserData(lendingPool, account) {
  const {
    totalCollateralETH,
    totalDebtETH,
    availableBorrowsETH,
    healthFactor
  } = await lendingPool.getUserAccountData(account);

  if (parseFloat(healthFactor < 10)) {
    console.log("Account: ", account);
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);

    console.log(`You have ${availableBorrowsETH} worth of ETH.`);
    console.log(`Your helthFactor is: ${ethers.utils.formatEther(healthFactor)}.`);
  }
  return { availableBorrowsETH, totalDebtETH };
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
