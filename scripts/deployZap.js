const ethers = require("ethers");
const config = require("../config/config.json");
const metadata = require("../artifacts/contracts/Liquidator.sol/Liquidator.json");
require("dotenv").config();
const uniswap = require("../config/uniswap.json");
const aave = require("../config/aave.json");

const CHAIN = "mainnet";
const MY_ACCOUNT = config.keys.fake;
const PROVIDER_URL = config.rpcUrl[CHAIN].local;

const WETH_ADDRESS = aave[CHAIN].iWeth.address;
const SWAPROUTER_ADDRESS = uniswap[CHAIN].swapRouter.address;
const LENDINGPOOL_ADDRESS = aave[CHAIN].v2.lendingPool.address;

async function deploy() {
  const provider = new ethers.providers.JsonRpcProvider(process.env[PROVIDER_URL]);
  const deployer = new ethers.Wallet(process.env[MY_ACCOUNT], provider);

  let gasPrice = await deployer.getFeeData();
  console.log("gasPrice: ", gasPrice.gasPrice.toString());
  console.log("maxFeePerGas:", gasPrice.maxFeePerGas.toString());
  console.log("maxPriorityFeePerGas:", gasPrice.maxPriorityFeePerGas.toString());

  let options;
  if (CHAIN == "mainnet") {
    options = {
      gasLimit: 1000000,
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
      maxFeePerGas: gasPrice.maxFeePerGas,
    };
  } else if (CHAIN == "polygon") {
    options = {
      gasLimit: 1000000,
      gasPrice: "31000000000",
    };
  }
  // Deploy the contract
  const factory = new ethers.ContractFactory(metadata.abi, metadata.bytecode, deployer);

  const contract = await factory.deploy(
    WETH_ADDRESS,
    SWAPROUTER_ADDRESS,
    LENDINGPOOL_ADDRESS,
    options
  );
  await contract.deployed();
  console.log(`Deployment successful! Contract Address: ${contract.address}`);
}

deploy();
