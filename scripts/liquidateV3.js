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
  getBorrowUserDataV3,
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
  chain,
  securityWall
) {
  const LIQUIDATION_COST = 1500000; //1636082;
  const CHAIN = chain;
  const VICTIM_ADDRESS = victimAddress;
  const TOKEN_DEBT_ADDRESS = debtToken.address;
  const TOKEN_DEBT_DECIMALS = debtToken.decimals;
  const COL_ADDRESS = colToken.address;
  const TOKEN_COL_BONUS = colToken.bonus;

  const WRAPPER_ADDRESS = aave[CHAIN].iWeth.address;
  const WRAPPER_ABI = aave[CHAIN].iWeth.abi;

  const LENDINGPOOL_ADDRESS = aave[CHAIN].v3.lendingPool.address;
  const LENDINGPOOL_ABI = aave[CHAIN].v3.lendingPool.abi;
  const RECEIVE_A_TOKEN = false;

  const PRICE_ORACLE_ADDRESS = aave[CHAIN].v3.priceOracle.address;
  const PRICE_ORACLE_ABI = aave[CHAIN].v3.priceOracle.abi;

  const EXCHANGE_ADDRESS = uniswap[CHAIN].swapRouter.address;
  const EXCHANGE_ABI = uniswap[CHAIN].swapRouter.abi;
  const poolFee = 3000;

  let provider = new ethers.providers.JsonRpcProvider(process.env[publicProvider]);
  let deployer = new ethers.Wallet(process.env[myAccount], provider);

  const gasPrice = await deployer.getGasPrice();
  const GAS_PRICE = parseInt(gasPrice * 1.1);

  const baseTokenAddress = WRAPPER_ADDRESS;
  const debtTokenAddress = TOKEN_DEBT_ADDRESS;

  const lendingPool = await getLendingPool(
    LENDINGPOOL_ADDRESS,
    LENDINGPOOL_ABI,
    deployer
  );
  const { formattedHF } = await getBorrowUserDataV3(lendingPool, VICTIM_ADDRESS);

  if (formattedHF < 1) {
    //---------------------------------------------
    const dataProvider = new ethers.Contract(
      aave[CHAIN].v3.dataProvider.address,
      aave[CHAIN].v3.dataProvider.abi,
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

    let SWAP_AMOUNT = parseInt(currentVariableDebt / 2);

    const MIN_OUTPUT_AMOUNT = parseInt(SWAP_AMOUNT * 0.98).toString();

    SWAP_AMOUNT = parseInt(
      (SWAP_AMOUNT / 10 ** TOKEN_DEBT_DECIMALS) * baseTokenPrice
    ).toString();

    let LIQUIDATION_TOTAL_COST = LIQUIDATION_COST * GAS_PRICE;

    let reward = parseInt(SWAP_AMOUNT * TOKEN_COL_BONUS);

    if (CHAIN == "polygon") {
      const matic_price_wei = await getPrice(
        PRICE_ORACLE_ADDRESS,
        PRICE_ORACLE_ABI,
        deployer,
        WRAPPER_ADDRESS
      );
      const matic_price_eth = ethers.utils.formatUnits(matic_price_wei, 8).toString();
      LIQUIDATION_TOTAL_COST = parseInt(LIQUIDATION_TOTAL_COST * matic_price_eth);
    }

    reward = parseFloat(ethers.utils.formatEther(reward.toString()));

    LIQUIDATION_TOTAL_COST = parseFloat(
      ethers.utils.formatEther(LIQUIDATION_TOTAL_COST.toString())
    );

    const PROFITABLE = reward > LIQUIDATION_TOTAL_COST;
    console.log("MEV found...\n");
    console.log("Victim:", VICTIM_ADDRESS);
    console.log("Col token:", COL_ADDRESS);
    console.log("Debt token", TOKEN_DEBT_ADDRESS);
    console.log("Gas cost:", LIQUIDATION_TOTAL_COST);
    console.log("Bonus:", reward, "\n");
    if (PROFITABLE) {
      // CALCULANDO CUÁNTO ME QUEDA EN LA CUENTA POR SEGURIDAD
      //---------------------------------------------
      let ethCompromised = parseInt(SWAP_AMOUNT * (1 + TOKEN_COL_BONUS));
      ethCompromised = ethers.utils.formatEther(ethCompromised.toString());
      const totalEthCompromised =
        parseFloat(ethCompromised) + parseFloat(LIQUIDATION_TOTAL_COST);

      let balance = await deployer.getBalance();
      console.log("My balance:", ethers.utils.formatEther(balance));
      console.log("EthCompromised (debt + gasCost):", totalEthCompromised);
      const residuo = parseFloat(balance) - totalEthCompromised;
      console.log("Result balance:", residuo);
      //---------------------------------------------

      if (residuo >= securityWall) {
        provider = new ethers.providers.JsonRpcProvider(process.env[privateProvider]);
        deployer = new ethers.Wallet(process.env[myAccount], provider);
        await getWeth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, SWAP_AMOUNT, GAS_PRICE);

        if (TOKEN_DEBT_ADDRESS !== aave[CHAIN].iWeth.address) {
          await approveErc20(
            baseTokenAddress,
            WRAPPER_ABI,
            EXCHANGE_ADDRESS,
            SWAP_AMOUNT,
            deployer,
            GAS_PRICE
          );

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
          await swapTokens(EXCHANGE_ADDRESS, EXCHANGE_ABI, deployer, params, GAS_PRICE);
        }

        balance = await deployer.getBalance();
        await getErc20Balance(baseTokenAddress, WRAPPER_ABI, deployer);
        const DEBT_TO_COVER = await getErc20Balance(
          debtTokenAddress,
          WRAPPER_ABI,
          deployer
        );
        await approveErc20(
          debtTokenAddress,
          WRAPPER_ABI,
          lendingPool.address,
          DEBT_TO_COVER,
          deployer,
          GAS_PRICE
        );
        await liquidateUser(
          lendingPool,
          COL_ADDRESS,
          debtTokenAddress,
          VICTIM_ADDRESS,
          DEBT_TO_COVER,
          RECEIVE_A_TOKEN,
          GAS_PRICE
        );

        // await getBorrowUserDataV3(lendingPool, VICTIM_ADDRESS);

        if (COL_ADDRESS !== aave[CHAIN].iWeth.address) {
          const bonusBalance = await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer);

          await approveErc20(
            COL_ADDRESS,
            WRAPPER_ABI,
            EXCHANGE_ADDRESS,
            bonusBalance,
            deployer,
            GAS_PRICE
          );

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

          await swapTokens(EXCHANGE_ADDRESS, EXCHANGE_ABI, deployer, params, GAS_PRICE);
        }

        await getEth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, GAS_PRICE);

        console.log("MEV extracted...\n");
      } else {
        console.log("insufficient funds...");
      }
    }
  }
}

module.exports = { liquidate };
