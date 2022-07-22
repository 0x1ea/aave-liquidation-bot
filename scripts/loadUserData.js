const { ethers } = require("hardhat");
const { saveData } = require("../utils/saveData");

const uniqueUsers = require("../data_polygon/uniqueUsers_polygon.json");
const startIndex = require("../data_polygon/index.json");

const OUTPUT_FOLDER_NAME = "data_polygon";
const OUTPUT_FILE_NAME = "users_data_polygon";

async function main() {
  console.log(`Total users: ${uniqueUsers.length}`);

  console.log("Test acc: ", uniqueUsers[1]);

  const myIndex = startIndex.length - 1;

  const start = startIndex[myIndex] || uniqueUsers.length;

  console.log("Starting from: ", start);
  for (let index = start; index >= 0; index--) {
    const account = uniqueUsers[index];
    const lendingPool = await getLendingPool(uniqueUsers[index]);
    await getBorrowUserData(lendingPool, account, index);
  }
}

async function getLendingPool() {
  /**
   * LendingPool:
   * Mainnet: 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
   * Polygon: 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf
   */
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf"
  );
  return lendingPool;
}

async function getBorrowUserData(lendingPool, account, index) {
  const {
    totalCollateralETH,
    totalDebtETH,
    availableBorrowsETH,
    healthFactor
  } = await lendingPool.getUserAccountData(account);

  const formattedHF = parseFloat(ethers.utils.formatEther(healthFactor));

  if (formattedHF < 1.1) {
    console.log("Account: ", account);
    console.log(`Have ${totalCollateralETH} worth of ETH deposited.`);
    console.log(`Have ${totalDebtETH} worth of ETH borrowed.`);
    console.log(`And his healthFactor is: ${ethers.utils.formatEther(healthFactor)}.\n`);

    const info = [
      {
        user: account,
        totalCollateralETH: totalCollateralETH.toString(),
        totalDebtETH: totalDebtETH.toString(),
        healthFactor: healthFactor.toString(),
        formattedHF: formattedHF
      }
    ];

    saveData(OUTPUT_FOLDER_NAME, OUTPUT_FILE_NAME, info);
  }
  const infoIindex = [index];
  saveData(OUTPUT_FOLDER_NAME, "index", infoIindex);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
