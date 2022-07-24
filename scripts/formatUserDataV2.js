const fs = require("fs");
const { ethers } = require("ethers");
require("dotenv").config();
const aave = require("../config/aave.json");
const config = require("../config/config.json");
const { convertConfiguration } = require("../utils/convertConfigurationV2");

/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */
const FOLDER_NAME = "ethereum_v2";
const INPUT_FILE_NAME = "users_data";
const OUTPUT_FILE_NAME = "formatted_users";
const HEALTH_FACTOR_LIMIT = 1;
const RPC_URL = config.rpcUrl.eth.public;
const KEY = config.keys.fake;
const DECIMALS = aave.polygon.v2.lendingPool.decimals;
const LENDINGPOOL_ADDRESS = aave.mainnet.v2.lendingPool.address;
const LENDINGPOOL_ABI = aave.polygon.v2.lendingPool.abi;
const CONFIG = aave.mainnet.v2.lendingPool.config;

async function formatUserData(decimals) {
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
        console.log(`${data[i].user}, ${configuration} \n`);
        const info = {
          user: data[i].user,
          totalCollateralETH: data[i].totalCollateralETH,
          formatTotalCollateralETH: parseFloat(
            ethers.utils.formatUnits(data[i].totalCollateralETH, decimals)
          ),
          totalDebtETH: data[i].totalDebtETH,
          formatTotalDebtETH: parseFloat(
            ethers.utils.formatUnits(data[i].totalDebtETH, decimals)
          ),
          healthFactor: data[i].healthFactor,
          formattedHF: data[i].formattedHF,
          userConfiguration: configuration
        };
        newUser.push(info);
      }
    }

    fs.writeFile(
      `./${FOLDER_NAME}/${OUTPUT_FILE_NAME}.json`,
      JSON.stringify(newUser),
      err => {
        if (err) {
          return console.error(err);
        }
      }
    );
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

// formatUserData(DECIMALS);

convertConfiguration(FOLDER_NAME, OUTPUT_FILE_NAME, "users_ready", 1, DECIMALS, CONFIG);

module.exports = { formatUserData };
