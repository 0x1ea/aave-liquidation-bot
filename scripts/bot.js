require("dotenv").config();
const { ethers } = require("ethers");
const aave = require("../config/aave.json");
const config = require("../config/config.json");
const uniswap = require("../config/uniswap.json");
const { liquidate } = require("./liquidate");

const LIQUIDATION_COST = 1636082;
const CHAIN = "mainnet";
const FOLDER_NAME = `${CHAIN}_v2`;
const INPUT_FILE_NAME = "users_ready";

// let GAS_PRICE = "30000000000";
const VICTIM_ADDRESS = "0xd940aAf3354D798B0537fA3679eB44faa37b4225";
const TOKEN_DEBT_ADDRESS = "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72";
const TOKEN_DEBT_DECIMALS = 18;
const COL_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // WETH Token
const PROVIDER_URL = config.rpcUrl.local;
const MY_ACCOUNT = config.keys.fake;

async function bot() {
  fs.readFile(`./data/${FOLDER_NAME}/${INPUT_FILE_NAME}.json`, async (err, buf) => {
    let save = buf.toString();
    const data = await JSON.parse(save);
    const end = data.length;

    data.forEach(user => {});
  });

  liquidate(VICTIM_ADDRESS, debtToken, COL_ADDRESS, PROVIDER_URL, MY_ACCOUNT);
}
fsdfsd;
