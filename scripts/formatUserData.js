const fs = require("fs");
const { ethers } = require("ethers");
require("dotenv").config();
const aave = require("../constants/aave.json");
const config = require("../constants/config.json");
const { convertConfiguration } = require("../utils/convertConfiguration");

// Valores que modificar antes de hacer el llamado a la funcion
const FOLDER_NAME = "polygon_v3";
const INPUT_FILE_NAME = "users_polygon_v3";
const OUTPUT_FILE_NAME = "formatted_users";
const HEALTH_FACTOR_LIMIT = 1.05;
const RPC_URL = config.rpcUrl.polygon.public;
const KEY = config.keys.fake;

/**
 * LendingPool:
 * Mainnet: 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
 * Polygon: 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf
 */

async function formatUserData(decimals) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const deployer = new ethers.Wallet(KEY, provider);

  fs.readFile(`./${FOLDER_NAME}/${INPUT_FILE_NAME}.json`, async (err, buf) => {
    let save = buf.toString();
    const data = await JSON.parse(save);
    const newUser = [];
    const end = data.length;
    for (let i = 0; i <= end; i++) {
      if (data[i]?.formattedHF <= HEALTH_FACTOR_LIMIT) {
        const VICTIM_ADDRESS = data[i].user;
        const lendingPool = await getLendingPool(
          aave.polygon.v3.pool.address,
          aave.polygon.v3.pool.abi,
          deployer
        );
        const configuration = await getUserConfiguration(lendingPool, VICTIM_ADDRESS);
        console.log(`${data[i].user}, ${configuration} \n`);
        const info = {
          user: data[i].user,
          totalCollateralBase: data[i].totalCollateralBase,
          formatTotalCollateralBase: parseFloat(
            ethers.utils.formatUnits(data[i].totalCollateralBase, decimals)
          ),
          totalDebtBase: data[i].totalDebtBase,
          formatTotalDebtBase: parseFloat(
            ethers.utils.formatUnits(data[i].totalDebtBase, decimals)
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

formatUserData(aave.polygon.v3.pool.decimals);

convertConfiguration(
  FOLDER_NAME,
  OUTPUT_FILE_NAME,
  "users_ready",
  1,
  aave.polygon.v3.pool.decimals
);

module.exports = { formatUserData };
