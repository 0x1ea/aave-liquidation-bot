const { ethers } = require("ethers");
const { saveData } = require("../utils/saveData");
const aave = require("../config/aave.json");
const config = require("../config/config.json");
require("dotenv").config();

/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */
const OUTPUT_FOLDER_NAME = "ethereum_v2";
const OUTPUT_FILE_NAME = "users_data";
const ACCOUNT = config.keys.fake;
const PROVIDER = config.rpcUrl.eth.public;
const CONTRACT_ADDRESS = aave.mainnet.v2.lendingPool.address;
const CONTRACT_ABI = aave.polygon.v2.lendingPool.abi;

async function loadUserDataV2() {
  const startIndex = require(`../${OUTPUT_FOLDER_NAME}/index.json`);
  const uniqueUsers = require(`../${OUTPUT_FOLDER_NAME}/all_users.json`);
  const provider = new ethers.providers.JsonRpcProvider(process.env[PROVIDER]);
  const deployer = new ethers.Wallet(process.env[ACCOUNT], provider);
  const myIndex = startIndex.length - 1;
  const start = startIndex[myIndex] || uniqueUsers.length - 1;

  console.log(`Total users: ${uniqueUsers.length}`);
  console.log("Starting from: ", start);
  for (let index = start; index >= 0; index--) {
    const account = uniqueUsers[index];
    const lendingPool = await getLendingPool(CONTRACT_ADDRESS, CONTRACT_ABI, deployer);
    await getBorrowUserData(lendingPool, account, index);
  }
}

async function getLendingPool(address, abi, account) {
  const lendingPool = new ethers.Contract(address, abi, account);
  return lendingPool;
}

// ⚠ ACUERDATE QUE EL RESULTADO VARIA ENTRE V2 Y V3 ⚠
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

loadUserDataV2();
