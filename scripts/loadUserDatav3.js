const { ethers } = require("ethers");
const { saveData } = require("../utils/saveData");
const aave = require("../config/aave.json");
const config = require("../config/config.json");
require("dotenv").config();

/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */
const OUTPUT_FOLDER_NAME = "optimism_v3";
const OUTPUT_FILE_NAME = "users_data";
const ACCOUNT = config.keys.fake;
const PROVIDER = config.rpcUrl.optimism.public;
const CONTRACT_ADDRESS = aave.optimism.v3.l2Pool.address;
const CONTRACT_ABI = aave.polygon.v3.pool.abi;

async function loadUserDataV3() {
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

// ⚠ ACUERDATE QUE EL RESULTADO VARIA ENTRE V2 Y V3 ⚠
async function getLendingPool(address, abi, account) {
  const lendingPool = new ethers.Contract(address, abi, account);
  return lendingPool;
}

async function getBorrowUserData(lendingPool, account, index) {
  const {
    totalCollateralBase,
    totalDebtBase,
    healthFactor
  } = await lendingPool.getUserAccountData(account);

  const formattedHF = parseFloat(ethers.utils.formatEther(healthFactor));

  if (formattedHF <= 1.1) {
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

loadUserDataV3();
