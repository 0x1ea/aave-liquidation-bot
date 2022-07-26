const fs = require("fs");
const { ethers } = require("ethers");
require("dotenv").config();
const aave = require("../config/aave.json");
const config = require("../config/config.json");
const { convertConfiguration } = require("../utils/convertConfigurationV2");
const { saveData } = require("../utils/saveData");
/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */

const CHAIN = "polygon";
const INPUT_FILE_NAME = "users_data";
const OUTPUT_FILE_NAME = "updated_users";
const KEY = config.keys.fake;
const RPC_URL = config.rpcUrl[CHAIN].public;

const FOLDER_NAME = `${CHAIN}_v2`;
const HEALTH_FACTOR_LIMIT = 1.1;
const DECIMALS = aave[CHAIN].v2.lendingPool.decimals;
const LENDINGPOOL_ADDRESS = aave[CHAIN].v2.lendingPool.address;
const LENDINGPOOL_ABI = aave[CHAIN].v2.lendingPool.abi;
const CONFIG = aave[CHAIN].v2.lendingPool.config;

async function refreshUserData(decimals) {
  const provider = new ethers.providers.JsonRpcProvider(process.env[RPC_URL]);
  const deployer = new ethers.Wallet(process.env[KEY], provider);

  fs.readFile(`./${FOLDER_NAME}/${INPUT_FILE_NAME}.json`, async (err, buf) => {
    let save = buf.toString();
    const data = await JSON.parse(save);
    const newUser = [];
    const end = data.length;
    for (let i = 0; i <= end; i++) {
      if (data[i]?.formattedHF <= HEALTH_FACTOR_LIMIT) {
        const VICTIM_ADDRESS = data[i].user;
        const lendingPool = await getLendingPool(
          LENDINGPOOL_ADDRESS,
          LENDINGPOOL_ABI,
          deployer
        );
        const configuration = await getUserConfiguration(lendingPool, VICTIM_ADDRESS);
        const {
          totalCollateralETH,
          totalDebtETH,
          healthFactor,
          formattedHF
        } = await getBorrowUserData(lendingPool, VICTIM_ADDRESS);
        console.log(`${data[i].user}, ${configuration} \n`);

        const info = {
          user: data[i].user,
          totalCollateralETH: totalCollateralETH.toString(),
          formatTotalCollateralETH: parseFloat(
            ethers.utils.formatUnits(totalCollateralETH.toString(), decimals)
          ),
          totalDebtETH: totalDebtETH.toString(),
          formatTotalDebtETH: parseFloat(
            ethers.utils.formatUnits(totalDebtETH.toString(), decimals)
          ),
          healthFactor: healthFactor.toString(),
          formattedHF: formattedHF,
          userConfiguration: configuration
        };
        saveData(FOLDER_NAME, OUTPUT_FILE_NAME, [info]);
      }
    }
  });
}

async function getUserConfiguration(lendingPool, account) {
  const configuration = await lendingPool.getUserConfiguration(account);
  return configuration.toString();
}

async function getLendingPool(address, abi, account) {
  const lendingPool = new ethers.Contract(address, abi, account);
  return lendingPool;
}

async function getBorrowUserData(lendingPool, account) {
  const {
    totalCollateralETH,
    totalDebtETH,
    healthFactor
  } = await lendingPool.getUserAccountData(account);

  const formattedHF = parseFloat(ethers.utils.formatEther(healthFactor));
  return {
    totalCollateralETH,
    totalDebtETH,
    healthFactor,
    formattedHF
  };
}

refreshUserData(DECIMALS);

// convertConfiguration(FOLDER_NAME, OUTPUT_FILE_NAME, "users_ready", 1, DECIMALS, CONFIG);

module.exports = { refreshUserData };
