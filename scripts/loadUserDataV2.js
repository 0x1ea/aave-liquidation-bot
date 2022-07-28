const { ethers } = require("ethers");
const { saveData } = require("../utils/saveData");
const { updateValues } = require("../utils/updateValues");
const aave = require("../config/aave.json");
const config = require("../config/config.json");
require("dotenv").config();

/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */
const CHAIN = "polygon";
const OUTPUT_FILE_NAME = "users_data";
const ACCOUNT = config.keys.fake;
const PROVIDER = config.rpcUrl[CHAIN].public;

const OUTPUT_FOLDER_NAME = `${CHAIN}_v2`;
const CONTRACT_ADDRESS = aave[CHAIN].v2.lendingPool.address;
const CONTRACT_ABI = aave[CHAIN].v2.lendingPool.abi;

async function loadUserDataV2() {
  const startIndex = require(`../data/${OUTPUT_FOLDER_NAME}/index.json`);
  const uniqueUsers = require(`../data/${OUTPUT_FOLDER_NAME}/all_users.json`);
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
    console.log(`And his healthFactor is: ${formattedHF}.\n`);

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

  updateValues(OUTPUT_FOLDER_NAME, "index", index, 0);
}

loadUserDataV2();
