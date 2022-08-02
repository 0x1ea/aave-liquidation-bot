require("dotenv").config();
const { BigNumber } = require("ethers");
const { ethers } = require("ethers");
const aave = require("../config/aave.json");
const {
  getBorrowUserData,
  getLendingPool,
  getPrice,
  getEth
} = require("../utils/liquidationUtils");

async function zapLiquidator(
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
  const COL_ADDRESS = colToken.address;
  // const TOKEN_COL_BONUS = parseInt(colToken.bonus * 100);
  const TOKEN_COL_BONUS = 100000;
  const SECURITY_WALL = ethers.utils.parseEther(securityWall);
  let NONCE = nonce;

  const WRAPPER_ADDRESS = aave[CHAIN].iWeth.address;
  const WRAPPER_ABI = aave[CHAIN].iWeth.abi;

  const LENDINGPOOL_ADDRESS = aave[CHAIN].v2.lendingPool.address;
  const LENDINGPOOL_ABI = aave[CHAIN].v2.lendingPool.abi;

  const PRICE_ORACLE_ADDRESS = aave[CHAIN].v2.priceOracle.address;
  const PRICE_ORACLE_ABI = aave[CHAIN].v2.priceOracle.abi;

  const ZAP_ADDRESS = aave[CHAIN].liquidator.address;
  const ZAP_ABI = aave[CHAIN].liquidator.abi;

  let provider = new ethers.providers.JsonRpcProvider(process.env[publicProvider]);
  let deployer = new ethers.Wallet(process.env[myAccount], provider);

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
  // console.log(formattedHF, formattedHF < 1);

  if (formattedHF < 1) {
    // Estimo el coste total de la liquidacion
    let gasPrice = await deployer.getFeeData();
    gasPrice.gasPrice = gasPrice.gasPrice.mul(20);
    gasPrice.gasPrice = gasPrice.gasPrice.div(100);

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
    // console.log("swap_amount_in_base_token", swap_amount_in_base_token.toString()); //aaaaaaaaaa
    // console.log("baseTokenPrice", baseTokenPrice.toString());

    // Convierto el precio base de la deuda al precio en ETH
    let input_swap_amount_in_eth = swap_amount_in_base_token.mul(baseTokenPrice);
    input_swap_amount_in_eth = input_swap_amount_in_eth.div(ethers.utils.parseEther("1"));

    // console.log("input_swap_amount_in_eth", input_swap_amount_in_eth.toString()); // aaaaaaaaaaaaaaaaaaaaaaaaaaa

    let LIQUIDATION_TOTAL_COST = LIQUIDATION_COST.mul(gasPrice.gasPrice);

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
      // console.log("matic_price_wei:", matic_price_wei.toString());
      LIQUIDATION_TOTAL_COST = LIQUIDATION_TOTAL_COST.mul(matic_price_wei);
      LIQUIDATION_TOTAL_COST = LIQUIDATION_TOTAL_COST.div(ethers.utils.parseEther("1"));

      input_swap_amount_in_eth = input_swap_amount_in_eth.mul(
        ethers.utils.parseEther("1")
      );
      input_swap_amount_in_eth = input_swap_amount_in_eth.div(matic_price_wei);
    }

    const PROFITABLE = reward.gt(LIQUIDATION_TOTAL_COST);
    // console.log(reward.toString(), LIQUIDATION_TOTAL_COST.toString());

    /**
     * ⚠  ⚠  ⚠
     * ⚠ CONTROL DE SEGURIDAD #2: verifico que sea rentable la liquidacion.
     * ⚠   El coste del gas debe ser menor al liquidationBonus
     * ⚠  ⚠  ⚠
     */
    // CALCULO CUÁNTO ME QUEDA EN LA CUENTA POR SEGURIDAD
    //---------------------------------------------
    let totalEthCompromised = input_swap_amount_in_eth.add(LIQUIDATION_TOTAL_COST);
    let balance = await deployer.getBalance();
    console.log("My balance:", ethers.utils.formatEther(balance));
    console.log(
      "EthCompromised (debt + gasCost):",
      ethers.utils.formatEther(totalEthCompromised)
    );
    let residuo = balance.sub(totalEthCompromised);
    console.log("Result balance:", ethers.utils.formatEther(residuo));
    //---------------------------------------------
    if (PROFITABLE) {
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
          const contract = new ethers.Contract(
            // ZAP_ADDRESS,
            "0x51d1439B74648Bbb1f7012F6c43DcB8f8591D361",
            ZAP_ABI,
            deployer
          );
          // Estimo el coste total de la liquidacion
          let gasPrice = await deployer.getFeeData();
          gasPrice.gasPrice = gasPrice.gasPrice.mul(20);
          gasPrice.gasPrice = gasPrice.gasPrice.div(100);

          console.log("Contract data:");
          balance = await provider.getBalance(contract.address);
          console.log("ETH balance: ", ethers.utils.formatEther(balance));
          await getErc20Balance(TOKEN_DEBT_ADDRESS, WRAPPER_ABI, deployer, contract);
          await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer, contract);
          await getErc20Balance(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, contract);
          console.log("-\n");

          console.log("Deployer data:");
          balance = await deployer.getBalance();
          console.log("My ETH balance: ", ethers.utils.formatEther(balance));
          await getErc20Balance(TOKEN_DEBT_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, deployer);
          console.log("-\n");

          console.log("Getting victim data before liquidation...");
          await getBorrowUserData(lendingPool, VICTIM_ADDRESS, true);

          console.log("liquidando...");
          await contract.liquidate(TOKEN_DEBT_ADDRESS, COL_ADDRESS, VICTIM_ADDRESS, {
            value: input_swap_amount_in_eth,
            gasLimit: 2000000,
            maxFeePerGas: gasPrice.maxFeePerGas,
            maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
          });
          NONCE++;
          console.log("Done!");

          console.log("Getting victim data after liquidation...");
          await getBorrowUserData(lendingPool, VICTIM_ADDRESS, true);

          console.log("Contract data:");
          balance = await provider.getBalance(contract.address);
          console.log("ETH balance: ", ethers.utils.formatEther(balance));
          await getErc20Balance(TOKEN_DEBT_ADDRESS, WRAPPER_ABI, deployer, contract);
          await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer, contract);
          await getErc20Balance(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, contract);
          console.log("-\n");

          console.log("Deployer data:");
          balance = await deployer.getBalance();
          console.log("My ETH balance: ", ethers.utils.formatEther(balance));
          await getErc20Balance(TOKEN_DEBT_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, deployer);
          console.log("-\n");

          await getEth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, gasPrice);

          console.log("Deployer data:");
          balance = await deployer.getBalance();
          console.log("My ETH balance: ", ethers.utils.formatEther(balance));
          await getErc20Balance(TOKEN_DEBT_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, deployer);
          console.log("-\n");
        } catch (error) {
          console.log("Error liquidando...");
          console.log(error, "\n");
          return new Promise(resolve => {
            resolve(NONCE++);
          });
        }

        console.log("MEV extracted...\n");
      } else {
        console.log("insufficient funds...");
      }
    }
  }
  // }
  return new Promise(resolve => {
    resolve(NONCE);
  });
}

async function getErc20Balance(erc20Address, abi, deployer, account) {
  const erc20Contract = new ethers.Contract(erc20Address, abi, deployer);
  const balance = await erc20Contract.balanceOf(account.address);
  const symbol = await erc20Contract.symbol();
  const decimals = await erc20Contract.decimals();
  console.log(`${symbol} balance: ${ethers.utils.formatUnits(balance, decimals)}`);
  return balance;
}

module.exports = { zapLiquidator };
