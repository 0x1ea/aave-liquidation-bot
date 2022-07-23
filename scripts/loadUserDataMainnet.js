const { ethers } = require("ethers");
const LendingPoolABI = require("../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json");
const { saveData } = require("../utils/saveData");
require("dotenv").config();

const OUTPUT_FOLDER_NAME = "data_mainnet";
const OUTPUT_FILE_NAME = "users_data_mainnet";

const startIndex = require("../data_mainnet/index.json");
let uniqueUsers = require("../data_mainnet/all_users.json");

const rpcUrl = {
  dev: process.env.ALCHEMY_MAINNET_RPC_URL
};

const key = {
  dev: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  production: process.env.PRIVATE_KEY
};

async function main() {
  console.log(rpcUrl.dev);
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl.dev);
  const deployer = new ethers.Wallet(key.dev, provider);
  const myIndex = startIndex.length - 1;

  const start = startIndex[myIndex] || uniqueUsers.length;
  console.log("Starting from: ", start);

  for (let index = start; index >= 0; index--) {
    const account = uniqueUsers[index];
    const lendingPool = await getLendingPool(deployer);
    await getBorrowUserData(lendingPool, account, index);
  }
}

async function getLendingPool(account) {
  /**
   * LendingPool:
   * Mainnet: 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
   * Polygon: 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf
   */
  const lendingPool = new ethers.Contract(
    "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
    LendingPoolABI.abi,
    account
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

  if (formattedHF <= 1.1) {
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

main();
