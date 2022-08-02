require("dotenv").config();
const { BigNumber } = require("ethers");
const { ethers } = require("ethers");
const aave = require("../config/aave.json");
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
  chain,
  securityWall,
  nonce
) {
  const LIQUIDATION_COST = BigNumber.from(1500000);
  const CHAIN = chain;
  const VICTIM_ADDRESS = victimAddress;
  const TOKEN_DEBT_ADDRESS = debtToken.address;
  const TOKEN_DEBT_DECIMALS = debtToken.decimals;
  const COL_ADDRESS = colToken.address;
  const TOKEN_COL_BONUS = parseInt(colToken.bonus * 100);
  // const TOKEN_COL_BONUS = 100000;
  const SECURITY_WALL = ethers.utils.parseEther(securityWall);
  let NONCE = nonce;

  const WRAPPER_ADDRESS = aave[CHAIN].iWeth.address;
  const WRAPPER_ABI = aave[CHAIN].iWeth.abi;

  const LENDINGPOOL_ADDRESS = aave[CHAIN].v2.lendingPool.address;
  const LENDINGPOOL_ABI = aave[CHAIN].v2.lendingPool.abi;
  const RECEIVE_A_TOKEN = false;

  const PRICE_ORACLE_ADDRESS = aave[CHAIN].v2.priceOracle.address;
  const PRICE_ORACLE_ABI = aave[CHAIN].v2.priceOracle.abi;

  const EXCHANGE_ADDRESS = uniswap[CHAIN].swapRouter.address;
  const EXCHANGE_ABI = uniswap[CHAIN].swapRouter.abi;
  const poolFee = 3000;

  let provider = new ethers.providers.JsonRpcProvider(process.env[publicProvider]);
  let deployer = new ethers.Wallet(process.env[myAccount], provider);

  const baseTokenAddress = WRAPPER_ADDRESS;
  const debtTokenAddress = TOKEN_DEBT_ADDRESS;

  const lendingPool = await getLendingPool(
    LENDINGPOOL_ADDRESS,
    LENDINGPOOL_ABI,
    deployer
  );
  const { formattedHF } = await getBorrowUserData(lendingPool, VICTIM_ADDRESS);

  /**
   * ⚠  ⚠  ⚠
   * ⚠ CONTROL DE SEGURIDAD #1: verifico que la victima se pueda liquidar.
   * ⚠  ⚠  ⚠
   */
  if (formattedHF < 1) {
    const dataProvider = new ethers.Contract(
      aave[CHAIN].v2.dataProvider.address,
      aave[CHAIN].v2.dataProvider.abi,
      deployer
    );
    const { currentVariableDebt } = await dataProvider.getUserReserveData(
      debtTokenAddress,
      VICTIM_ADDRESS
    );

    // Get price in TOKEN/ETH | TOKEN/BASE_TOKEN
    const baseTokenPrice = await getPrice(
      PRICE_ORACLE_ADDRESS,
      PRICE_ORACLE_ABI,
      deployer,
      debtTokenAddress
    );

    let swap_amount_in_base_token = currentVariableDebt.div(2);

    let MIN_OUTPUT_AMOUNT = swap_amount_in_base_token.mul(98);
    MIN_OUTPUT_AMOUNT = MIN_OUTPUT_AMOUNT.div(100);

    // Convierto el precio base de la deuda al precio en ETH
    let input_swap_amount_in_eth = swap_amount_in_base_token.div(
      BigNumber.from(10).pow(TOKEN_DEBT_DECIMALS)
    );
    input_swap_amount_in_eth = input_swap_amount_in_eth.mul(baseTokenPrice);

    // Estimo el coste total de la liquidacion
    const gasPrice = await deployer.getGasPrice();
    let GAS_PRICE = gasPrice.mul(20);
    GAS_PRICE = GAS_PRICE.div(100);
    // GAS_PRICE = BigNumber.from("100000000000");

    let LIQUIDATION_TOTAL_COST = LIQUIDATION_COST.mul(GAS_PRICE);

    let reward = input_swap_amount_in_eth.mul(TOKEN_COL_BONUS);
    reward = reward.div(100);

    if (CHAIN == "polygon") {
      // Si la cadena es Polygon, el precio del base token es en MATIC
      const matic_price_wei = await getPrice(
        PRICE_ORACLE_ADDRESS,
        PRICE_ORACLE_ABI,
        deployer,
        WRAPPER_ADDRESS
      );
      const MATIC_PRICE_IN_ETH = ethers.utils.formatEther(matic_price_wei);
      LIQUIDATION_TOTAL_COST = LIQUIDATION_TOTAL_COST.mul(MATIC_PRICE_IN_ETH);
    }

    const PROFITABLE = reward.gt(LIQUIDATION_TOTAL_COST);

    /**
     * ⚠  ⚠  ⚠
     * ⚠ CONTROL DE SEGURIDAD #2: verifico que sea rentable la liquidacion.
     * ⚠   El coste del gas debe ser menor al liquidationBonus
     * ⚠  ⚠  ⚠
     */
    if (PROFITABLE) {
      // CALCULO CUÁNTO ME QUEDA EN LA CUENTA POR SEGURIDAD
      //---------------------------------------------
      let totalEthCompromised = input_swap_amount_in_eth.add(LIQUIDATION_TOTAL_COST);
      let balance = await deployer.getBalance();
      // console.log("My balance:", ethers.utils.formatEther(balance));
      // console.log(
      //   "EthCompromised (debt + gasCost):",
      //   ethers.utils.formatEther(totalEthCompromised)
      // );
      let residuo = balance.sub(totalEthCompromised);
      // console.log("Result balance:", ethers.utils.formatEther(residuo));
      //---------------------------------------------

      const is_hight_debt = residuo.lt(SECURITY_WALL);
      if (is_hight_debt) {
        // CALCULO CUÁNTO ME QUEDA EN LA CUENTA POR SEGURIDAD
        // EN CASO DE QUE EL MONTO A LIQUIDAR SEA SUPERIOR AL
        // SALDO DE MI CUENTA
        input_swap_amount_in_eth = BigNumber.from("300000000000000000");
        let totalEthCompromised = input_swap_amount_in_eth.add(LIQUIDATION_TOTAL_COST);
        residuo = balance.sub(totalEthCompromised);

        balance = await deployer.getBalance();
        console.log("My balance:", ethers.utils.formatEther(balance));
        console.log(
          "curated ethCompromised (debt + gasCost):",
          ethers.utils.formatEther(totalEthCompromised)
        );
        console.log("curated result balance:", ethers.utils.formatEther(residuo));
      }

      /**
       * ⚠  ⚠  ⚠
       * ⚠ CONTROL DE SEGURIDAD #3: verifico que quede suficiente fondos en la cuenta
       * ⚠   antes y después de la liquidación.
       * ⚠  ⚠  ⚠
       */
      const enought_balance = residuo.gt(SECURITY_WALL);
      if (enought_balance) {
        console.log("MEV found...\n");
        console.log("Victim:", VICTIM_ADDRESS);
        console.log("Col token:", COL_ADDRESS);
        console.log("Debt token", TOKEN_DEBT_ADDRESS);
        balance = await deployer.getBalance();
        console.log("My balance:", ethers.utils.formatEther(balance));
        console.log("Gas cost:", ethers.utils.formatEther(LIQUIDATION_TOTAL_COST));
        console.log("Bonus:", ethers.utils.formatEther(reward), "\n");
        console.log(
          "Swap amount in: ",
          ethers.utils.formatEther(input_swap_amount_in_eth)
        );

        provider = new ethers.providers.JsonRpcProvider(process.env[privateProvider]);
        deployer = new ethers.Wallet(process.env[myAccount], provider);

        try {
          console.log("Consiguiendo el Weth...");
          await getWeth(
            WRAPPER_ADDRESS,
            WRAPPER_ABI,
            deployer,
            input_swap_amount_in_eth.toString(),
            GAS_PRICE,
            NONCE
          );
          NONCE++;
          console.log("Done!");
        } catch (error) {
          console.log("Error consiguiendo WETH...");
          console.log(error, "\n");
          return new Promise(resolve => {
            resolve(NONCE++);
          });
        }

        if (TOKEN_DEBT_ADDRESS !== aave[CHAIN].iWeth.address) {
          try {
            let amount_in_eth = input_swap_amount_in_eth.toString();
            console.log("Aprobando el erc20...");
            await approveErc20(
              WRAPPER_ADDRESS,
              WRAPPER_ABI,
              EXCHANGE_ADDRESS,
              amount_in_eth,
              deployer,
              GAS_PRICE,
              NONCE
            );
            NONCE++;
            console.log("Done!");
          } catch (error) {
            console.log("Error aprobando antes del primer swap...");
            console.log(error, "\n");
            return new Promise(resolve => {
              resolve(NONCE++);
            });
          }

          let params = {
            tokenIn: baseTokenAddress,
            tokenOut: debtTokenAddress,
            fee: poolFee,
            recipient: deployer.address,
            deadline: parseInt(Date.now() * 1000),
            amountIn: input_swap_amount_in_eth.toString(),
            amountOutMinimum: MIN_OUTPUT_AMOUNT,
            sqrtPriceLimitX96: 0 //parseInt(Math.sqrt(baseTokenPrice) * 2 * 96)
          };

          try {
            console.log("Haciendo el primer swap...");
            await swapTokens(
              EXCHANGE_ADDRESS,
              EXCHANGE_ABI,
              deployer,
              params,
              GAS_PRICE,
              NONCE
            );
            NONCE++;
            console.log("Done!");
          } catch (error) {
            NONCE++;
            console.log("Error haciendo el swap de WETH a TOKEN...");
            console.log(error, "\n");
            return new Promise(resolve => {
              resolve(NONCE);
            });
          }
        }

        const DEBT_TO_COVER = await getErc20Balance(
          debtTokenAddress,
          WRAPPER_ABI,
          deployer
        );

        try {
          console.log("Aprobando el erc20 antes de liquidar...");
          await approveErc20(
            debtTokenAddress,
            WRAPPER_ABI,
            lendingPool.address,
            DEBT_TO_COVER,
            deployer,
            GAS_PRICE,
            NONCE
          );
          NONCE++;
          console.log("Done");
        } catch (error) {
          NONCE++;
          console.log("Error aprobando antes de la liquidacion...");
          console.log(error.code, "\n");
          return new Promise(resolve => {
            resolve(NONCE);
          });
        }

        try {
          console.log("Liquidando...");
          await liquidateUser(
            lendingPool,
            COL_ADDRESS,
            debtTokenAddress,
            VICTIM_ADDRESS,
            DEBT_TO_COVER,
            RECEIVE_A_TOKEN,
            GAS_PRICE,
            NONCE
          );
          NONCE++;
          console.log("Done!");
        } catch (error) {
          NONCE++;
          onsole.log("Error liquidando...");
          console.log(error.code, "\n");
          return new Promise(resolve => {
            resolve(NONCE);
          });
        }

        if (COL_ADDRESS !== aave[CHAIN].iWeth.address) {
          const bonusBalance = await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer);

          try {
            await approveErc20(
              COL_ADDRESS,
              WRAPPER_ABI,
              EXCHANGE_ADDRESS,
              bonusBalance,
              deployer,
              GAS_PRICE,
              NONCE
            );
            NONCE++;
          } catch (error) {
            NONCE++;
            console.log("Error aprobando despues de la liquidacion...");
            console.log(error.code, "\n");
            return new Promise(resolve => {
              resolve(NONCE);
            });
          }

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

          try {
            await swapTokens(
              EXCHANGE_ADDRESS,
              EXCHANGE_ABI,
              deployer,
              params,
              GAS_PRICE,
              NONCE
            );
            NONCE++;
          } catch (error) {
            NONCE++;
            console.log("Error haciendo el segundo swap...");
            console.log(error.code, "\n");
            return new Promise(resolve => {
              resolve(NONCE);
            });
          }

          try {
            await getEth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, GAS_PRICE, NONCE);
            NONCE++;
          } catch (error) {
            NONCE++;
            console.log("Error obteniendo el ETH...");
            console.log(error.code, "\n");
            return new Promise(resolve => {
              resolve(NONCE);
            });
          }
        } else {
          try {
            await getEth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, GAS_PRICE, NONCE);
            NONCE++;
          } catch (error) {
            NONCE++;
            console.log("Error obteniendo el ETH...");
            console.log(error.code, "\n");
            return new Promise(resolve => {
              resolve(NONCE);
            });
          }
        }

        console.log("MEV extracted...\n");
      } else {
        console.log("insufficient funds...");
      }
    }
  }
  return new Promise(resolve => {
    resolve(NONCE);
  });
}

module.exports = { liquidate };
