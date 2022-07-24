const { ethers } = require("hardhat");
const { saveData } = require("../utils/saveData");
const aave = require("../constants/aave.json");
const uniqueUsers = require("../polygon_v3/all_users.json");
const startIndex = require("../polygon_v3/index.json");

const OUTPUT_FOLDER_NAME = "polygon_v3";
const OUTPUT_FILE_NAME = "users_polygon_v3";

async function main() {
  console.log(`Total users: ${uniqueUsers.length}`);

  console.log("Test acc: ", uniqueUsers[1]);

  const myIndex = startIndex?.length - 1;

  const start = startIndex[myIndex] || uniqueUsers.length - 1;

  console.log("Starting from: ", start);
  for (let index = start; index >= 0; index--) {
    const account = uniqueUsers[index];
    const lendingPool = await getLendingPool("IPool", aave.polygon.v3.pool.address);
    await getBorrowUserData(lendingPool, account, index);
  }
}

async function getLendingPool(name, address) {
  /**
   * LendingPool:
   * Mainnet: 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
   * Polygon: 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf
   */
  const lendingPool = await ethers.getContractAt(name, address);
  return lendingPool;
}

// ⚠ ACUERDATE QUE EL RESULTADO VARIA ENTRE V2 Y V3 ⚠
async function getBorrowUserData(lendingPool, account, index) {
  const {
    totalCollateralBase,
    totalDebtBase,
    availableBorrowsBase,
    healthFactor
  } = await lendingPool.getUserAccountData(account);

  const formattedHF = parseFloat(ethers.utils.formatEther(healthFactor));

  if (formattedHF < 1.1) {
    console.log("Account: ", account);
    console.log(`Have ${totalCollateralBase} worth of ETH deposited.`);
    console.log(`Have ${totalDebtBase} worth of ETH borrowed.`);
    console.log(`And his healthFactor is: ${ethers.utils.formatEther(healthFactor)}.\n`);

    const info = [
      {
        user: account,
        totalCollateralBase: totalCollateralBase.toString(),
        totalDebtBase: totalDebtBase.toString(),
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
