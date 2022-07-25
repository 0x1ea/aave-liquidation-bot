const { ethers } = require("ethers");
const aave = require("../config/aave.json");
const config = require("../config/config.json");
require("dotenv").config();

/**
 * TO DO:
 *  - obtener el gas y los precios antes de hacer todo
 */

/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */
const GAS_PRICE = "35100000000";
const VICTIM_ADDRESS = "0xF3A92cC865B3e3116304bBB2DA2D6614d356DA6a";
const PROVIDER_URL = config.rpcUrl.local;
const MY_ACCOUNT = config.keys.fake;

const WRAPPER_ADDRESS = aave.polygon.iWeth.address;
const WRAPPER_ABI = aave.polygon.iWeth.abi;

const LENDINGPOOL_ADDRESS = aave.polygon.v2.lendingPool.address;
const LENDINGPOOL_ABI = aave.polygon.v2.lendingPool.abi;

const TOKEN_DEBT_ADDRESS = "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063";
const YOUR_COL_PRICE = 0.0005505157; // WMATIC/ETH
const HIS_DEBT_PRICE = 0.0006215823; // DAI/ETH

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env[PROVIDER_URL]);
  const deployer = new ethers.Wallet(process.env[MY_ACCOUNT], provider);

  const baseTokenAddress = WRAPPER_ADDRESS;
  const debtTokenAddress = TOKEN_DEBT_ADDRESS;

  console.log(`My account: ${deployer.address}\n`);
  console.log("Getting victim data before liquidation...");

  const lendingPool = await getLendingPool(
    LENDINGPOOL_ADDRESS,
    LENDINGPOOL_ABI,
    deployer
  );
  const { formattedHF, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    VICTIM_ADDRESS
  );

  const AMOUNT = (parseInt(totalDebtETH / YOUR_COL_PRICE) * 3).toString();
  let BORROW_AMOUNT = parseInt(totalDebtETH / 2.01);
  BORROW_AMOUNT = parseInt(BORROW_AMOUNT / HIS_DEBT_PRICE).toString();

  // AMOUNT
  if (formattedHF < 1) {
    await getWeth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer, "50000000000000000000");

    const balance = await deployer.getBalance();
    console.log("My MATIC balance: ", ethers.utils.formatEther(balance));
    await getErc20Balance(baseTokenAddress, deployer);
    await getErc20Balance(debtTokenAddress, deployer);

    await approveErc20(baseTokenAddress, lendingPool.address, AMOUNT, deployer);
    console.log("Supplying WMATIC...");

    await lendingPool.deposit(baseTokenAddress, AMOUNT, deployer.address, 0, {
      gasPrice: GAS_PRICE,
      gasLimit: "283000"
    });
    console.log("- Done!\n");

    console.log(`Borrowing  ${BORROW_AMOUNT} weis of ERC20 to repay the debt...`);
    await borrowErc20(debtTokenAddress, lendingPool, BORROW_AMOUNT, deployer);
    console.log("- Done!\n");

    // const midBalance = await deployer.getBalance();
    // console.log("My MATIC balance: ", ethers.utils.formatEther(midBalance));
    // await getErc20Balance(baseTokenAddress, deployer);

    const erc20Balance = await getErc20Balance(debtTokenAddress, deployer);

    console.log(`Approving all ${erc20Balance} wei units of ERC20 token borrowed...`);
    await approveErc20(debtTokenAddress, lendingPool.address, erc20Balance, deployer);
    console.log("- Done!\n");

    const collateralAddress = baseTokenAddress;
    const debt = debtTokenAddress;
    const debtToCover = erc20Balance;
    const receiveAToken = false;

    console.log("Liquidating...");
    await liquidateUser(
      lendingPool,
      collateralAddress,
      debt,
      VICTIM_ADDRESS,
      debtToCover,
      receiveAToken
    );

    console.log("Getting victim data after liquidation...");
    await getBorrowUserData(lendingPool, VICTIM_ADDRESS);

    let newBalance = await deployer.getBalance();
    console.log("My MATIC balance: ", ethers.utils.formatEther(newBalance));
    await getErc20Balance(baseTokenAddress, deployer);
    await getErc20Balance(debtTokenAddress, deployer);

    console.log("Swapping WMATIC for MATIC...");
    await getEth(WRAPPER_ADDRESS, WRAPPER_ABI, deployer);
    console.log("- Done!\n");

    newBalance = await deployer.getBalance();
    console.log("My MATIC balance: ", ethers.utils.formatEther(newBalance));
    await getErc20Balance(baseTokenAddress, deployer);
    await getErc20Balance(debtTokenAddress, deployer);
  }
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

async function getWeth(address, abi, account, amount) {
  const erc20Contract = new ethers.Contract(address, abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  const tx = await erc20Contract.deposit({
    value: amount,
    gasLimit: "60041",
    gasPrice: GAS_PRICE
  });
  await tx.wait(1);
  return balance.toString();
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

async function borrowErc20(erc20Address, lendingPool, borrow, account) {
  const borrowtx = await lendingPool.borrow(erc20Address, borrow, 2, 0, account.address, {
    gasPrice: GAS_PRICE,
    gasLimit: "404000"
  });
  await borrowtx.wait(1);
}

async function getErc20Balance(erc20Address, account) {
  const erc20Contract = new ethers.Contract(erc20Address, WRAPPER_ABI, account);
  const balance = await erc20Contract.balanceOf(account.address);
  const symbol = await erc20Contract.symbol();
  const decimals = await erc20Contract.decimals();
  console.log(`My ${symbol} balance: ${ethers.utils.formatUnits(balance, decimals)}`);
  return balance.toString();
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
    { gasPrice: GAS_PRICE, gasLimit: "572000" }
  );

  const response = await liquidateTx.wait(1);
  console.log(`- Done!\n\n`);
}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
  const erc20Token = new ethers.Contract(erc20Address, WRAPPER_ABI, account);
  const tx = await erc20Token.approve(spenderAddress, amountToSpend, {
    gasLimit: "60000",
    gasPrice: GAS_PRICE
  });
  await tx.wait(2);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
