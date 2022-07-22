const fs = require("fs");
const { ethers } = require("ethers");

const LendingPoolABI = require("../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json");
const erc20ABI = require("../artifacts/contracts/interfaces/IWeth.sol/IWeth.json");
const chainData = require("../constants/reservesList.json");
require("dotenv").config();

// Valores que modificar antes de hacer el llamado a la funcion
const FOLDER_NAME = "data_polygon";
const INPUT_FILE_NAME = "users_data_polygon";
const OUTPUT_FILE_NAME = "formatted_users_data_polygon";

const key = {
  dev: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  production: process.env.PRIVATE_KEY
};

const rpcUrl = {
  dev: "http://127.0.0.1:8545/",
  public: process.env.PUBLIC_FORK_RPC_URL,
  production: process.env.FORK_RPC_URL
};

async function formatUserData() {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl.production);
  const deployer = new ethers.Wallet(key.dev, provider);

  // const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  // const wmaticAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  // const mainTokenAddress = wmaticAddress;
  // const erc20AddressDebt = TOKEN_DEBT_ADDRESS;

  fs.readFile(`./${FOLDER_NAME}/${INPUT_FILE_NAME}.json`, async (err, buf) => {
    let save = buf.toString();
    const data = await JSON.parse(save);
    const newUser = [];
    const end = data.length;
    for (let i = 0; i <= end; i++) {
      if (data[i]?.formattedHF <= 1) {
        const VICTIM_ADDRESS = data[i].user;
        const lendingPool = await getLendingPool(deployer);
        const configuration = await getUserConfiguration(lendingPool, VICTIM_ADDRESS);
        console.log(data[i].user);
        console.log(configuration);
        console.log("\n");
        const info = {
          user: data[i].user,
          totalCollateralETH: data[i].totalCollateralETH,
          formatTotalCollateralETH: parseFloat(
            ethers.utils.formatEther(data[i].totalCollateralETH)
          ),
          totalDebtETH: data[i].totalDebtETH,
          formatTotalDebtETH: parseFloat(ethers.utils.formatEther(data[i].totalDebtETH)),
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

async function getLendingPool(account) {
  /**
   * LendingPool:
   * Mainnet: 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
   * Polygon: 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf
   */
  const lendingPool = new ethers.Contract(
    "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf",
    LendingPoolABI.abi,
    account
  );
  return lendingPool;
}

// formatUserData();

module.exports = { formatUserData };
