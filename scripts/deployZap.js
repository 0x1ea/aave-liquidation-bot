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
  gasPrice.gasPrice = gasPrice.gasPrice.mul(20);
  gasPrice.gasPrice = gasPrice.gasPrice.div(100);

  console.log("maxFeePerGas:", gasPrice.maxFeePerGas.toString());
  console.log("maxPriorityFeePerGas:", gasPrice.maxPriorityFeePerGas.toString());

  const options = {
    gasLimit: 1500000,
    // gasPrice: "35000000000"
    maxFeePerGas: gasPrice.maxFeePerGas,
    maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
  };

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

  // const debtTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  // const colTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  // const VICTIM = "0x9bE5D213245be984C0fB806a1d92C03a05448A4D";

  // balance = await deployer.getBalance();
  // console.log("My ETH balance: ", ethers.utils.formatEther(balance));
  // await getErc20Balance(debtTokenAddress, IERC20.abi, deployer, contract);
  // await getErc20Balance(colTokenAddress, IERC20.abi, deployer, contract);
  // console.log("-\n");

  // await contract.liquidate(debtTokenAddress, colTokenAddress, VICTIM, {
  //   value: ethers.utils.parseEther("1"),
  //   gasLimit: 1500000,
  //   gasPrice: 30000000000
  // });

  // console.log("Contract data:");
  // balance = await provider.getBalance(contract.address);
  // console.log("ETH balance: ", ethers.utils.formatEther(balance));
  // await getErc20Balance(debtTokenAddress, IERC20.abi, deployer, contract);
  // await getErc20Balance(colTokenAddress, IERC20.abi, deployer, contract);
  // console.log("-\n");

  // console.log("Deployer data:");
  // balance = await deployer.getBalance();
  // console.log("My ETH balance: ", ethers.utils.formatEther(balance));
  // await getErc20Balance(debtTokenAddress, IERC20.abi, deployer, deployer);
  // await getErc20Balance(colTokenAddress, IERC20.abi, deployer, deployer);
  // console.log("-\n");
}

// async function getErc20Balance(erc20Address, abi, deployer, account) {
//   const erc20Contract = new ethers.Contract(erc20Address, abi, deployer);
//   const balance = await erc20Contract.balanceOf(account.address);
//   const symbol = await erc20Contract.symbol();
//   const decimals = await erc20Contract.decimals();
//   console.log(`${symbol} balance: ${ethers.utils.formatUnits(balance, decimals)}`);
//   return balance;
// }

deploy();
