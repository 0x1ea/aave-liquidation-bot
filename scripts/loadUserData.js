const { getNamedAccounts, ethers } = require("hardhat");
const uniqueUsers = require("../data/all_users.json");
const { saveData } = require("../utils/saveData");
async function main() {
  // const length = uniqueUsers.length;
  const lenght = 47309;

  for (let index = length - 1; index >= 0; index--) {
    // if (parseFloat(data[index].amount) > 1) {
    const account = uniqueUsers[index];
    // console.log("Account: ", account);
    // LendingPoolAddressesProvider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const lendingPool = await getLendingPool(uniqueUsers[index]);
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
    "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9" // WETH
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

  const formattedHF = parseFloat(ethers.utils.formatEther(healthFactor));

  if (formattedHF < 2) {
    console.log("Account: ", account);
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
    console.log(`You have ${availableBorrowsETH} worth of ETH.`);
    console.log(`Your helthFactor is: ${ethers.utils.formatEther(healthFactor)}.`);

    const info = [
      {
        user: account,
        totalCollateralETH: totalCollateralETH.toString(),
        totalDebtETH: totalDebtETH.toString(),
        availableBorrowsETH: availableBorrowsETH.toString(),
        healthFactor: healthFactor.toString(),
        formattedHF: formattedHF
      }
    ];

    saveData("users_data2", info);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
