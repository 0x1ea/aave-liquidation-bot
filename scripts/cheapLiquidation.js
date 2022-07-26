const { ethers } = require("ethers");
const aave = require("../config/aave.json");
const config = require("../config/config.json");
const uniswap = require("../config/uniswap.json");
require("dotenv").config();

/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */
const LIQUIDATION_COST = 1636082;
const CHAIN = "mainnet";
let GAS_PRICE = "30000000000";
const VICTIM_ADDRESS = "0x1A17a71358B41AfbcaC2C1b891e1509554170640";
const TOKEN_DEBT_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const TOKEN_DEBT_DECIMALS = 18;
const COL_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH Token
const PROVIDER_URL = config.rpcUrl.local;
const MY_ACCOUNT = config.keys.fake;

const WRAPPER_ADDRESS = aave[CHAIN].iWeth.address;
const WRAPPER_ABI = aave[CHAIN].iWeth.abi;

const LENDINGPOOL_ADDRESS = aave[CHAIN].v2.lendingPool.address;
const LENDINGPOOL_ABI = aave[CHAIN].v2.lendingPool.abi;
const RECEIVE_A_TOKEN = false;

const PRICE_ORACLE_ADDRESS = aave[CHAIN].priceOracle.address;
const PRICE_ORACLE_ABI = aave[CHAIN].priceOracle.abi;
// const YOUR_COL_PRICE = 0.0005432525; // WMATIC/ETH
// const HIS_DEBT_PRICE = 0.0006579497; // DAI/ETH

//---------------------------------------------------------

const EXCHANGE_ADDRESS = uniswap[CHAIN].swapRouter.address;
const EXCHANGE_ABI = uniswap[CHAIN].swapRouter.abi;
const poolFee = 3000;
//---------------------------------------------------------

async function cheapLiquidation() {
  const provider = new ethers.providers.JsonRpcProvider(process.env[PROVIDER_URL]);
  const deployer = new ethers.Wallet(process.env[MY_ACCOUNT], provider);

  const gasPrice = await deployer.getGasPrice();
  GAS_PRICE = "30000000000"; //parseInt(gasPrice * 1.1);
  console.log("gasPrice: ", GAS_PRICE);

  const baseTokenAddress = WRAPPER_ADDRESS;
  const debtTokenAddress = TOKEN_DEBT_ADDRESS;

  console.log(`My account: ${deployer.address}\n`);
  console.log("Getting victim data before liquidation...");

  //---------------------------------------------
  const dataProvider = new ethers.Contract(
    aave.polygon.v2.dataProvider.address,
    aave.polygon.v2.dataProvider.abi,
    deployer
  );
  const { currentVariableDebt } = await dataProvider.getUserReserveData(
    debtTokenAddress,
    VICTIM_ADDRESS
  );

  //---------------------------------------------
  const lendingPool = await getLendingPool(
    LENDINGPOOL_ADDRESS,
    LENDINGPOOL_ABI,
    deployer
  );
  const { formattedHF, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    VICTIM_ADDRESS
  );

  const baseTokenPrice = await getPrice(
    PRICE_ORACLE_ADDRESS,
    PRICE_ORACLE_ABI,
    deployer,
    debtTokenAddress
  );

  console.log(`Debt/ETH price: ${baseTokenPrice}`);
  console.log(`currentVariableDebt: ${currentVariableDebt}`);

  // debo pasar la deuda en el precio de usdc a eth
  let SWAP_AMOUNT = parseInt(currentVariableDebt / 2); //parseInt(totalDebtETH / 2);
  console.log(SWAP_AMOUNT);

  const MIN_OUTPUT_AMOUNT = parseInt(SWAP_AMOUNT * 0.98).toString();

  SWAP_AMOUNT = parseInt(
    (SWAP_AMOUNT / 10 ** TOKEN_DEBT_DECIMALS) * baseTokenPrice
  ).toString();

  console.log(SWAP_AMOUNT);

  if (formattedHF < 1) {
    console.log(`Getting ${SWAP_AMOUNT} weis of weth...`);
    await getWeth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, SWAP_AMOUNT);
    console.log("Done!\n");

    // let balance = await deployer.getBalance();
    // console.log("My ETH balance: ", ethers.utils.formatEther(balance));
    // await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
    // await getErc20Balance(debtTokenAddress, WRAPPER_ABI, deployer);
    // console.log("-\n");

    if (TOKEN_DEBT_ADDRESS !== aave[CHAIN].iWeth.address) {
      console.log("Approving for Swapping...");
      await approveErc20(
        baseTokenAddress,
        WRAPPER_ABI,
        EXCHANGE_ADDRESS,
        SWAP_AMOUNT,
        deployer
      );
      console.log("Done!\n");

      let params = {
        tokenIn: baseTokenAddress,
        tokenOut: debtTokenAddress,
        fee: poolFee,
        recipient: deployer.address,
        deadline: parseInt(Date.now() * 1000),
        amountIn: SWAP_AMOUNT,
        amountOutMinimum: MIN_OUTPUT_AMOUNT,
        sqrtPriceLimitX96: 0
      };

      console.log("Swapping WETH for debt token...");
      await swapTokens(EXCHANGE_ADDRESS, EXCHANGE_ABI, deployer, params);
      console.log("Done!\n");
    }

    balance = await deployer.getBalance();
    console.log("My MATIC balance: ", ethers.utils.formatEther(balance));
    await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
    const DEBT_TO_COVER = await getErc20Balance(debtTokenAddress, WRAPPER_ABI, deployer);
    console.log("-\n");

    console.log(`Approving all ${DEBT_TO_COVER} wei units of ERC20 token borrowed...`);
    await approveErc20(
      debtTokenAddress,
      WRAPPER_ABI,
      lendingPool.address,
      DEBT_TO_COVER,
      deployer
    );
    console.log("- Done!\n");

    console.log("Liquidating...");
    await liquidateUser(
      lendingPool,
      COL_ADDRESS,
      // baseTokenAddress,
      debtTokenAddress,
      VICTIM_ADDRESS,
      DEBT_TO_COVER,
      RECEIVE_A_TOKEN
    );

    console.log("Getting victim data after liquidation...");
    await getBorrowUserData(lendingPool, VICTIM_ADDRESS);

    if (COL_ADDRESS !== aave[CHAIN].iWeth.address) {
      balance = await deployer.getBalance();
      console.log("My ETH balance: ", ethers.utils.formatEther(balance));
      await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
      await getErc20Balance(debtTokenAddress, WRAPPER_ABI, deployer);
      const bonusBalance = await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer);
      console.log("-\n");

      console.log("Approving for Swapping the col token for weth...");
      await approveErc20(
        COL_ADDRESS,
        WRAPPER_ABI,
        EXCHANGE_ADDRESS,
        bonusBalance,
        deployer
      );
      console.log("Done!\n");

      params = {
        tokenIn: COL_ADDRESS,
        tokenOut: baseTokenAddress,
        fee: poolFee,
        recipient: deployer.address,
        deadline: parseInt(Date.now() * 1000),
        amountIn: bonusBalance,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      };

      console.log("Swapping col token for WETH...");
      await swapTokens(EXCHANGE_ADDRESS, EXCHANGE_ABI, deployer, params);
      console.log("Done!\n");

      balance = await deployer.getBalance();
      console.log("My ETH balance: ", ethers.utils.formatEther(balance));
      await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
      await getErc20Balance(debtTokenAddress, WRAPPER_ABI, deployer);
      await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer);
      console.log("-\n");
    }
    // balance = await deployer.getBalance();
    // console.log("My ETH balance: ", ethers.utils.formatEther(balance));
    // await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
    // await getErc20Balance(debtTokenAddress, WRAPPER_ABI, deployer);
    // console.log("-\n");

    // console.log("Swapping WMATIC for MATIC...");
    // await getEth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer);
    // console.log("- Done!\n");

    console.log("Swapping WETH for ETH...");
    await getEth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer);
    console.log("- Done!\n");

    balance = await deployer.getBalance();
    console.log("My ETH balance: ", ethers.utils.formatEther(balance));
    await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
    await getErc20Balance(debtTokenAddress, WRAPPER_ABI, deployer);
    await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer);
    console.log("-\n");
  }
}

async function getWeth(address, abi, account, amount) {
  const erc20Contract = new ethers.Contract(address, abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  const tx = await erc20Contract.deposit({
    value: amount,
    gasLimit: "60041"
    // gasPrice: GAS_PRICE
  });
  // await tx.wait(1);
  return balance.toString();
}

async function approveErc20(erc20Address, abi, spenderAddress, amountToSpend, account) {
  const erc20Token = new ethers.Contract(erc20Address, abi, account);
  const tx = await erc20Token.approve(spenderAddress, amountToSpend, {
    gasLimit: "63000"
    // gasPrice: GAS_PRICE
  });
  await tx.wait(2);
}

async function getErc20Balance(erc20Address, abi, account) {
  const erc20Contract = new ethers.Contract(erc20Address, abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  const symbol = await erc20Contract.symbol();
  const decimals = await erc20Contract.decimals();
  console.log(`My ${symbol} balance: ${ethers.utils.formatUnits(balance, decimals)}`);
  return balance.toString();
}

async function swapTokens(address, abi, account, params) {
  const uniswapRouter = new ethers.Contract(address, abi, account);
  await uniswapRouter.exactInputSingle(params, {
    gasLimit: "300000",
    gasPrice: GAS_PRICE
  });
}

async function getBorrowUserData(lendingPool, account) {
  const {
    totalCollateralETH,
    totalDebtETH,
    availableBorrowsETH,
    healthFactor
  } = await lendingPool.getUserAccountData(account);

  const formattedHF = parseFloat(ethers.utils.formatEther(healthFactor));

  console.log("\nAccount: ", account);
  console.log(
    `Have ${ethers.utils.formatEther(totalCollateralETH)} worth of ETH deposited.`
  );
  console.log(`Have ${ethers.utils.formatEther(totalDebtETH)} worth of ETH borrowed.`);
  console.log(`His helthFactor is: ${formattedHF}.\n`);

  return { formattedHF, totalCollateralETH, totalDebtETH };
}

async function getEth(address, abi, account) {
  const erc20Contract = new ethers.Contract(address, abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  const tx = await erc20Contract.withdraw(balance, {
    gasLimit: "37041",
    gasPrice: GAS_PRICE
  });
  await tx.wait(2);
  return balance.toString();
}

async function getLendingPool(address, abi, account) {
  const lendingPool = new ethers.Contract(address, abi, account);
  return lendingPool;
}

async function liquidateUser(
  lendingPool,
  collateralAddress,
  debt,
  VICTIM_ADDRESS,
  debtToCover,
  receiveAToken
) {
  const liquidateTx = await lendingPool.liquidationCall(
    collateralAddress,
    debt,
    VICTIM_ADDRESS,
    debtToCover,
    receiveAToken,
    { gasPrice: GAS_PRICE, gasLimit: "750000" }
  );

  // await liquidateTx.wait(1);
  console.log(`- Done!\n\n`);
}

async function getPrice(address, abi, account, baseTokenAddress) {
  const contract = new ethers.Contract(address, abi, account);
  let price = await contract.getAssetPrice(baseTokenAddress);
  // price = price / 1e18;
  return price;
}

// async function getUserDebt

cheapLiquidation();
