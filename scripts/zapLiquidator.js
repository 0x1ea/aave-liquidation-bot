require("dotenv").config();
const { ethers, BigNumber } = require("ethers");
const aave = require("../config/aave.json");
const {
  getBorrowUserData,
  getLendingPool,
  getPrice,
  getEth,
} = require("../utils/liquidationUtils");

async function zapLiquidator(
  _victim_address,
  _debt_token,
  _col_token,
  _public_provider,
  _private_provider,
  _my_account,
  _chain,
  _security_wall
) {
  const LIQUIDATION_COST = BigNumber.from(1200000);
  const DEBT_ADDRESS = _debt_token.address;
  const COL_ADDRESS = _col_token.address;
  const TOKEN_COL_BONUS = parseInt(_col_token.bonus * 100);
  // const TOKEN_COL_BONUS = 100000;
  const margin_of_safety = ethers.utils.parseEther(_security_wall);

  const WRAPPER_ADDRESS = aave[_chain].iWeth.address;
  const WRAPPER_ABI = aave[_chain].iWeth.abi;

  const DATA_PROVIDER_ADDRESS = aave[_chain].v2.dataProvider.address;
  const DATA_PROVIDER_ABI = aave[_chain].v2.dataProvider.abi;

  const LENDINGPOOL_ADDRESS = aave[_chain].v2.lendingPool.address;
  const LENDINGPOOL_ABI = aave[_chain].v2.lendingPool.abi;

  const PRICE_ORACLE_ADDRESS = aave[_chain].v2.priceOracle.address;
  const PRICE_ORACLE_ABI = aave[_chain].v2.priceOracle.abi;

  const ZAP_ADDRESS = aave[_chain].liquidator.address;
  const ZAP_ABI = aave[_chain].liquidator.abi;

  let provider = new ethers.providers.JsonRpcProvider(process.env[_public_provider]);
  let deployer = new ethers.Wallet(process.env[_my_account], provider);

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
    let gasPrice = await deployer.getFeeData();
    gasPrice.gasPrice = gasPrice.gasPrice.mul(120);
    gasPrice.gasPrice = gasPrice.gasPrice.div(100);

    if (_chain == "polygon") {
      gasPrice.gasPrice = BigNumber.from("31000000000");
    }

    const dataProvider = new ethers.Contract(
      DATA_PROVIDER_ADDRESS,
      DATA_PROVIDER_ABI,
      deployer
    );

    const { currentVariableDebt } = await dataProvider.getUserReserveData(
      DEBT_ADDRESS,
      _victim_address
    );

    // La máxima cantidad a liquidar será la mitad de la deuda variable
    let debt_to_cover = currentVariableDebt.div(2);

    // Get price in TOKEN/ETH
    const baseTokenPrice = await getPrice(
      PRICE_ORACLE_ADDRESS,
      PRICE_ORACLE_ABI,
      deployer,
      DEBT_ADDRESS
    );

    // Convierto el valor de la deuda en ETH
    let debt_to_cover_in_eth = debt_to_cover.mul(baseTokenPrice);
    debt_to_cover_in_eth = debt_to_cover_in_eth.div(ethers.utils.parseEther("1"));

    let transaction_cost = LIQUIDATION_COST.mul(gasPrice.gasPrice);

    let reward = debt_to_cover_in_eth.mul(TOKEN_COL_BONUS);
    reward = reward.div(100);

    if (_chain == "polygon") {
      /**
       * Si la cadena es polygon, el debtToCover debe medirse en MATIC y no en ETH
       */
      const matic_eth_price = await getPrice(
        PRICE_ORACLE_ADDRESS,
        PRICE_ORACLE_ABI,
        deployer,
        WRAPPER_ADDRESS
      );

      debt_to_cover_in_eth = debt_to_cover_in_eth.mul(ethers.utils.parseEther("1"));
      debt_to_cover_in_eth = debt_to_cover_in_eth.div(matic_eth_price);
    }

    /**
     * ⚠  ⚠  ⚠
     * ⚠ CONTROL DE SEGURIDAD #2: verifico que sea rentable la liquidacion.
     * ⚠   El coste del gas debe ser menor al liquidationBonus
     * ⚠  ⚠  ⚠
     */
    const PROFITABLE = reward.gt(transaction_cost);
    if (PROFITABLE) {
      /**
       * Si el debtToCover mas el costo de la transaccion es superior a mi balance menos el margen de seguridad
       * entonces debo ajustar el debtTocover al maximo valor posible tomando en cuenta el
       * margen de seguridad
       */
      let total_eth_compromised = debt_to_cover_in_eth.add(transaction_cost);
      let balance = await deployer.getBalance();
      let leftover_eth = balance.sub(total_eth_compromised);
      const is_hight_debt = leftover_eth.lt(margin_of_safety);
      if (is_hight_debt) {
        /**
         * El nuevo debtToCover sera igual a mi balance menos el margen de seguridad
         * y menos el costo de la transaccion
         */
        debt_to_cover_in_eth = balance.sub(margin_of_safety);
        debt_to_cover_in_eth = debt_to_cover_in_eth.sub(transaction_cost);
      }

      /**
       * ⚠  ⚠  ⚠
       * ⚠ CONTROL DE SEGURIDAD #3: verifico que quede suficiente fondos en la cuenta
       * ⚠   antes y después de la liquidación.
       * ⚠  ⚠  ⚠
       */
      const enought_balance = debt_to_cover_in_eth.gt(0);
      if (enought_balance) {
        console.log("Victim found...\n");
        console.log("Victim:", _victim_address);
        console.log("Col token:", COL_ADDRESS);
        console.log("Debt token", DEBT_ADDRESS);
        balance = await deployer.getBalance();
        console.log("My balance:", ethers.utils.formatEther(balance));
        console.log("Gas cost:", ethers.utils.formatEther(transaction_cost));
        console.log("Bonus:", ethers.utils.formatEther(reward), "\n");
        console.log("Swap amount in: ", ethers.utils.formatEther(debt_to_cover_in_eth));

        provider = new ethers.providers.JsonRpcProvider(process.env[_private_provider]);
        deployer = new ethers.Wallet(process.env[_my_account], provider);

        try {
          const contract = new ethers.Contract(ZAP_ADDRESS, ZAP_ABI, deployer);

          console.log("Contract data:");
          balance = await provider.getBalance(contract.address);
          console.log("ETH balance: ", ethers.utils.formatEther(balance));
          await getErc20Balance(DEBT_ADDRESS, WRAPPER_ABI, deployer, contract);
          await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer, contract);
          await getErc20Balance(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, contract);
          console.log("-\n");

          console.log("Deployer data:");
          balance = await deployer.getBalance();
          console.log("My ETH balance: ", ethers.utils.formatEther(balance));
          await getErc20Balance(DEBT_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, deployer);
          console.log("-\n");

          console.log("Getting victim data before liquidation...");
          await getBorrowUserData(lendingPool, VICTIM_ADDRESS, true);

          console.log("calling zap contract...");

          const txGasCost = await contract.estimateGas.liquidate(
            DEBT_ADDRESS,
            COL_ADDRESS,
            _victim_address,
            {
              value: debt_to_cover_in_eth,
            }
          );

          let options;
          if (_chain == "mainnet") {
            options = {
              value: debt_to_cover_in_eth,
              gasLimit: txGasCost,
              maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
              maxFeePerGas: gasPrice.maxFeePerGas,
            };
          } else if (_chain == "polygon") {
            options = {
              value: debt_to_cover_in_eth,
              gasLimit: txGasCost,
              gasPrice: gasPrice.gasPrice,
            };
          }

          console.log("txGasCost:", txGasCost.toString());
          await contract.liquidate(DEBT_ADDRESS, COL_ADDRESS, _victim_address, options);
          console.log("Done!");

          console.log("Getting victim data after liquidation...");
          await getBorrowUserData(lendingPool, _victim_address, true);

          console.log("Contract data:");
          balance = await provider.getBalance(contract.address);
          console.log("ETH balance: ", ethers.utils.formatEther(balance));
          await getErc20Balance(DEBT_ADDRESS, WRAPPER_ABI, deployer, contract);
          await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer, contract);
          await getErc20Balance(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, contract);
          console.log("-\n");

          console.log("Deployer data:");
          balance = await deployer.getBalance();
          console.log("My ETH balance: ", ethers.utils.formatEther(balance));
          await getErc20Balance(DEBT_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, deployer);
          console.log("-\n");

          await getEth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, gasPrice);

          console.log("Deployer data:");
          balance = await deployer.getBalance();
          console.log("My ETH balance: ", ethers.utils.formatEther(balance));
          await getErc20Balance(DEBT_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(COL_ADDRESS, WRAPPER_ABI, deployer, deployer);
          await getErc20Balance(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, deployer);
          console.log("-\n");
        } catch (error) {
          console.log("Liquidation error...");
          console.log(error, "\n");
          return new Promise((resolve) => {
            resolve(NONCE++);
          });
        }

        console.log("Liquidation excecuted successfully!\n");
      } else {
        console.log("insufficient funds...");
      }
    }
  }
  return new Promise(async (resolve) => {
    resolve(true);
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
