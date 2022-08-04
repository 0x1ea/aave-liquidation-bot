const ethers = require("ethers");
const config = require("../config/config.json");
const metadata = require("../artifacts/contracts/Liquidator.sol/Liquidator.json");
require("dotenv").config();
const uniswap = require("../config/uniswap.json");
const aave = require("../config/aave.json");

const CHAIN = "mainnet";
const MY_ACCOUNT = config.keys.fake;
const PROVIDER_URL = config.rpcUrl[CHAIN].alchemy;

async function deploy() {
  const provider = new ethers.providers.JsonRpcProvider(process.env[PROVIDER_URL]);
  const deployer = new ethers.Wallet(process.env[MY_ACCOUNT], provider);

  let gasPrice = await deployer.getFeeData();
  let gasPrice2 = gasPrice.gasPrice.mul(20);
  gasPrice2 = gasPrice2.div(100);

  console.log("gasPrice: ", ethers.utils.formatUnits(gasPrice.gasPrice, 9));
  // console.log("gasPrice2:", ethers.utils.formatUnits(gasPrice2, 9));
  console.log("maxFeePerGas:", ethers.utils.formatUnits(gasPrice.maxFeePerGas, 9));
  console.log(
    "maxPriorityFeePerGas:",
    ethers.utils.formatUnits(gasPrice.maxPriorityFeePerGas, 9)
  );
}

deploy();
