require("dotenv").config();
const { ethers, BigNumber } = require("ethers");
const aave = require("../config/aave.json");
const {
  getBorrowUserData,
  getLendingPool,
  getPrice,
} = require("../utils/liquidationUtils");
const { saveData } = require("../utils/saveData");

async function fakeZap(
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

  const debtTokenAddress = DEBT_ADDRESS;

  const lendingPool = await getLendingPool(
    LENDINGPOOL_ADDRESS,
    LENDINGPOOL_ABI,
    deployer
  );
  const { formattedHF } = await getBorrowUserData(lendingPool, _victim_address);

  /**
   * ⚠  ⚠  ⚠
   * ⚠ CONTROL DE SEGURIDAD #1: el hf debe ser menor a 1 para proceder con la
   * ⚠ liquidación.
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
      debtTokenAddress,
      _victim_address
    );
    // La máxima cantidad a liquidar será la mitad de la deuda variable
    let debt_to_cover = currentVariableDebt.div(2);

    // Get price in TOKEN/ETH
    const baseTokenPrice = await getPrice(
      PRICE_ORACLE_ADDRESS,
      PRICE_ORACLE_ABI,
      deployer,
      debtTokenAddress
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
     * ⚠   El coste de la transacción debe ser menor al reward de la liquidación
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
      // if (is_hight_debt) {
      if (false) {
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
      // if (enought_balance) {
      if (true) {
        provider = new ethers.providers.JsonRpcProvider(process.env[_private_provider]);
        deployer = new ethers.Wallet(process.env[_my_account], provider);

        const { totalCollateralETH, totalDebtETH, formattedHF } = await getBorrowUserData(
          lendingPool,
          _victim_address,
          false
        );

        // console.log("calling zap contract...");
        // const contract = new ethers.Contract(ZAP_ADDRESS, ZAP_ABI, deployer);
        // const txGasCost = await contract.estimateGas.liquidate(
        //   DEBT_ADDRESS,
        //   COL_ADDRESS,
        //   _victim_address,
        //   {
        //     value: debt_to_cover_in_eth,
        //   }
        // );

        const date = new Date(Date.now());
        const today = date.toLocaleDateString();
        const time = date.toLocaleTimeString();

        const profit = reward.sub(transaction_cost);

        const info = {
          date: today,
          time: time,
          user: _victim_address,
          colToken: _col_token,
          debtToken: _debt_token,
          userData: {
            totalCollateralETH: ethers.utils.formatEther(totalCollateralETH),
            totalDebtETH: ethers.utils.formatEther(totalDebtETH),
            formattedHF: formattedHF,
          },
          feeData: {
            gasPrice: ethers.utils.formatUnits(gasPrice.gasPrice, 9),
            maxPriorityFeePerGas: ethers.utils.formatUnits(
              gasPrice.maxPriorityFeePerGas,
              9
            ),
            maxFeePerGas: ethers.utils.formatUnits(gasPrice.maxFeePerGas, 9),
          },
          gasUsed: 1200000, // parseInt(txGasCost.toString()),
          amountIn: ethers.utils.formatEther(debt_to_cover_in_eth),
          gasCost: ethers.utils.formatEther(transaction_cost),
          reward: ethers.utils.formatEther(reward),
          profit: ethers.utils.formatEther(profit),
        };

        console.log("Saving data...");
        try {
          await saveData(`${_chain}_v2`, `bot_results`, info);
          console.log("Done!");
        } catch (error) {
          console.log("error guardando el archivo!\n");
        }
      } else {
        // console.log("insufficient funds...");
      }
    }
  }
  return new Promise(async (resolve) => {
    resolve(true);
  });
}

module.exports = { fakeZap };
