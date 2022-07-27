require("dotenv").config();
const { ethers } = require("ethers");
const aave = require("../config/aave.json");
const config = require("../config/config.json");
const uniswap = require("../config/uniswap.json");
const {
  getWeth,
  approveErc20,
  getErc20Balance,
  swapTokens,
  getBorrowUserData,
  getEth,
  getLendingPool,
  liquidateUser,
  getPrice
} = require("../utils/liquidationUtils");

async function liquidate(
  victimAddress,
  debtToken,
  colToken,
  publicProvider,
  privateProvider,
  myAccount,
  chain
) {
  const LIQUIDATION_COST = 1636082;
  const CHAIN = chain;
  const VICTIM_ADDRESS = victimAddress;
  const TOKEN_DEBT_ADDRESS = debtToken.address;
  const TOKEN_DEBT_DECIMALS = debtToken.decimals;
  const COL_ADDRESS = colToken.address; // WETH Token
  const TOKEN_COL_BONUS = colToken.bonus;

  const WRAPPER_ADDRESS = aave[CHAIN].iWeth.address;
  const WRAPPER_ABI = aave[CHAIN].iWeth.abi;

  const LENDINGPOOL_ADDRESS = aave[CHAIN].v2.lendingPool.address;
  const LENDINGPOOL_ABI = aave[CHAIN].v2.lendingPool.abi;
  const RECEIVE_A_TOKEN = false;

  const PRICE_ORACLE_ADDRESS = aave[CHAIN].priceOracle.address;
  const PRICE_ORACLE_ABI = aave[CHAIN].priceOracle.abi;

  //---------------------------------------------------------

  const EXCHANGE_ADDRESS = uniswap[CHAIN].swapRouter.address;
  const EXCHANGE_ABI = uniswap[CHAIN].swapRouter.abi;
  const poolFee = 3000;
  //---------------------------------------------------------

  let provider = new ethers.providers.JsonRpcProvider(process.env[publicProvider]);
  let deployer = new ethers.Wallet(process.env[myAccount], provider);

  const gasPrice = await deployer.getGasPrice();
  const GAS_PRICE = parseInt(gasPrice * 1.1);

  const baseTokenAddress = WRAPPER_ADDRESS;
  const debtTokenAddress = TOKEN_DEBT_ADDRESS;

  // console.log(`My account: ${deployer.address}\n`);
  // console.log("Getting victim data before liquidation...");

  const lendingPool = await getLendingPool(
    LENDINGPOOL_ADDRESS,
    LENDINGPOOL_ABI,
    deployer
  );
  const { formattedHF, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    VICTIM_ADDRESS
  );
  if (formattedHF < 1) {
    //---------------------------------------------
    const dataProvider = new ethers.Contract(
      aave[CHAIN].v2.dataProvider.address,
      aave[CHAIN].v2.dataProvider.abi,
      deployer
    );
    const { currentVariableDebt } = await dataProvider.getUserReserveData(
      debtTokenAddress,
      VICTIM_ADDRESS
    );
    //---------------------------------------------

    const baseTokenPrice = await getPrice(
      PRICE_ORACLE_ADDRESS,
      PRICE_ORACLE_ABI,
      deployer,
      debtTokenAddress
    );

    // console.log(`Debt/ETH price: ${baseTokenPrice}`);
    // console.log(`currentVariableDebt: ${currentVariableDebt}`);

    let SWAP_AMOUNT = parseInt(currentVariableDebt / 2);
    // console.log(SWAP_AMOUNT);

    const MIN_OUTPUT_AMOUNT = parseInt(SWAP_AMOUNT * 0.98).toString();

    SWAP_AMOUNT = parseInt(
      (SWAP_AMOUNT / 10 ** TOKEN_DEBT_DECIMALS) * baseTokenPrice
    ).toString();

    // console.log(SWAP_AMOUNT);
    const LIQUIDATION_TOTAL_COST = LIQUIDATION_COST * GAS_PRICE;
    // console.log("\nliquidation cost: ", LIQUIDATION_TOTAL_COST);
    // console.log("bonus: ", SWAP_AMOUNT * (1 + TOKEN_COL_BONUS));
    // console.log(
    //   "profitable: ",
    //   SWAP_AMOUNT * (1 + TOKEN_COL_BONUS) > LIQUIDATION_TOTAL_COST
    // );
    const PROFITABLE = SWAP_AMOUNT * (1 + TOKEN_COL_BONUS) > LIQUIDATION_TOTAL_COST;

    // balance = await deployer.getBalance();
    // console.log("My MATIC balance: ", ethers.utils.formatEther(balance));
    // await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
    // await getErc20Balance(debtTokenAddress, WRAPPER_ABI, deployer);
    // console.log("-\n");

    if (PROFITABLE) {
      console.log("MEV found...\n");
      provider = new ethers.providers.JsonRpcProvider(process.env[privateProvider]);
      deployer = new ethers.Wallet(process.env[myAccount], provider);
      console.log(`Getting ${SWAP_AMOUNT} weis of weth...`);
      await getWeth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, SWAP_AMOUNT, GAS_PRICE);
      console.log("Done!\n");

      if (TOKEN_DEBT_ADDRESS !== aave[CHAIN].iWeth.address) {
        console.log("Approving for Swapping...");
        await approveErc20(
          baseTokenAddress,
          WRAPPER_ABI,
          EXCHANGE_ADDRESS,
          SWAP_AMOUNT,
          deployer,
          GAS_PRICE
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
          sqrtPriceLimitX96: 0 //parseInt(Math.sqrt(baseTokenPrice) * 2 * 96)
        };

        console.log("Swapping WETH for debt token...");
        await swapTokens(EXCHANGE_ADDRESS, EXCHANGE_ABI, deployer, params, GAS_PRICE);
        console.log("Done!\n");
      }

      balance = await deployer.getBalance();
      console.log("My MATIC balance: ", ethers.utils.formatEther(balance));
      await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
      const DEBT_TO_COVER = await getErc20Balance(
        debtTokenAddress,
        WRAPPER_ABI,
        deployer
      );
      console.log("-\n");

      console.log(`Approving all ${DEBT_TO_COVER} wei units of ERC20 token borrowed...`);
      await approveErc20(
        debtTokenAddress,
        WRAPPER_ABI,
        lendingPool.address,
        DEBT_TO_COVER,
        deployer,
        GAS_PRICE
      );
      console.log("- Done!\n");

      console.log("Liquidating...");
      await liquidateUser(
        lendingPool,
        COL_ADDRESS,
        debtTokenAddress,
        VICTIM_ADDRESS,
        DEBT_TO_COVER,
        RECEIVE_A_TOKEN,
        GAS_PRICE
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
          deployer,
          GAS_PRICE
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
        await swapTokens(EXCHANGE_ADDRESS, EXCHANGE_ABI, deployer, params, GAS_PRICE);
        console.log("Done!\n");

        balance = await deployer.getBalance();
        console.log("My ETH balance: ", ethers.utils.formatEther(balance));
        await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
        await getErc20Balance(debtTokenAddress, WRAPPER_ABI, deployer);
        await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer);
        console.log("-\n");
      }

      console.log("Swapping WETH for ETH...");
      await getEth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, GAS_PRICE);
      console.log("- Done!\n");

      balance = await deployer.getBalance();
      console.log("My ETH balance: ", ethers.utils.formatEther(balance));
      await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
      await getErc20Balance(debtTokenAddress, WRAPPER_ABI, deployer);
      await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer);
      console.log("-\n");
    }
  }
}

module.exports = { liquidate };
