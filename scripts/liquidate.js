const { ethers } = require("ethers");
const LendingPoolABI = require("../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json");
const erc20ABI = require("../artifacts/contracts/interfaces/IWeth.sol/IWeth.json");
require("dotenv").config();

const chainData = require("../constants/reservesList.json");

const TOKEN_DEBT_ADDRESS = chainData.polygon[0].address;
const TOKEN_DEBT_SYMBOL = chainData.polygon[0].symbol;

const AMOUNT = ethers.utils.parseEther("0.5");

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const FakePrivateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const RPC_PROVIDER = process.env.FORK_RPC_URL;
  const FAKE_RPC_PROVIDER = "http://127.0.0.1:8545/";
  /**
   *
   *
   *
   *
   *
   *
   *
   */
  const provider = new ethers.providers.JsonRpcProvider(FAKE_RPC_PROVIDER);
  const deployer = new ethers.Wallet(FakePrivateKey, provider);
  /**
   *
   *
   *
   *
   *
   *
   *
   */
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const wmaticAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const mainTokenAddress = wmaticAddress;
  const erc20AddressDebt = TOKEN_DEBT_ADDRESS;

  console.log("My account: ", deployer.address);

  await getWeth(mainTokenAddress, deployer);

  const balance = await deployer.getBalance();
  console.log("MATIC balance: ", ethers.utils.formatEther(balance));
  await getErc20Balance(mainTokenAddress, deployer);
  await getErc20Balance(erc20AddressDebt, deployer);

  const lendingPool = await getLendingPool(deployer);

  // deposit!
  // approve
  await approveErc20(mainTokenAddress, lendingPool.address, AMOUNT, deployer);
  console.log("Depositing WMATIC...");
  await lendingPool.deposit(
    mainTokenAddress,
    AMOUNT,
    deployer.address,
    0
    /* { gasPrice: "31100000000"} */
  );
  console.log("Deposited!");

  console.log("Pidiendo prestado el ERC20 para pagar la deuda");
  const borrow = ethers.utils.parseEther("0.1");
  await borrowErc20(erc20AddressDebt, lendingPool, borrow, deployer);

  const midBalance = await deployer.getBalance();
  console.log("MATIC balance: ", ethers.utils.formatEther(midBalance));
  await getErc20Balance(mainTokenAddress, deployer);
  const erc20Balance = await getErc20Balance(erc20AddressDebt, deployer);

  console.log("Aprobando todo el usdt: ", ethers.utils.formatEther(erc20Balance));
  await approveErc20(erc20AddressDebt, lendingPool.address, erc20Balance, deployer);

  const collateralAddress = mainTokenAddress;
  const debt = erc20AddressDebt;
  const VICTIM_ADDRESS = "0x400F7C84ca06663b369E794f3228384E87A976d1";
  const debtToCover = erc20Balance;
  const receiveAToken = false;

  console.log("Getting victim data before liquidation...");
  await getBorrowUserData(lendingPool, VICTIM_ADDRESS);

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

  const newBalance = await deployer.getBalance();

  console.log("MATIC balance: ", ethers.utils.formatEther(newBalance));
  await getErc20Balance(mainTokenAddress, deployer);
  await getErc20Balance(erc20AddressDebt, deployer);
}

async function borrowErc20(erc20Address, lendingPool, borrow, account) {
  const borrowtx = await lendingPool.borrow(
    erc20Address,
    borrow,
    2,
    0,
    account.address
    /* { gasPrice: "31100000000" } */
  );
  await borrowtx.wait(1);
  console.log(`You've borrowed!`);
}

async function getWeth(erc20Address, account) {
  const erc20Contract = new ethers.Contract(erc20Address, erc20ABI.abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  const symbol = await erc20Contract.symbol();
  const decimals = await erc20Contract.decimals();
  console.log(`Depositando ${symbol}`);
  const tx = await erc20Contract.deposit({ value: AMOUNT });
  await tx.wait(1);
  console.log(`Obteniendo balance de ${symbol}`);
  console.log(`Got ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`);

  return balance.toString();
}

async function getErc20Balance(erc20Address, account) {
  const erc20Contract = new ethers.Contract(erc20Address, erc20ABI.abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  const symbol = await erc20Contract.symbol();
  const decimals = await erc20Contract.decimals();
  console.log(`${symbol} balance: ${ethers.utils.formatUnits(balance, decimals)}`);
  return balance.toString();
}

async function getLendingPool(account) {
  /**
   * LendingPool:
   * Mainnet: 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
   * Polygon: 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf
   */
  const lendingPool = new ethers.Contract(
    "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf",
    LendingPoolABI.abi,
    account
  );
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
    receiveAToken
    /* { gasPrice: "31100000000" } */
  );

  const response = await liquidateTx.wait(1);
  console.log(`You've Liquidated!`);
}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
  const erc20Token = new ethers.Contract(erc20Address, erc20ABI.abi, account);
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(2);
  console.log("Approved!");
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
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
