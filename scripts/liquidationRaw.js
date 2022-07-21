const { ethers } = require("ethers");
const LendingPoolABI = require("../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json");
const erc20ABI = require("../artifacts/contracts/interfaces/IWeth.sol/IWeth.json");

const AMOUNT = ethers.utils.parseEther("100");

async function main() {
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");
  const deployer = new ethers.Wallet(privateKey, provider);

  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const usdtAddress = "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd";

  console.log("My account: ", deployer.address);

  await getWeth(wethTokenAddress, deployer);

  const balance = await deployer.getBalance();
  console.log(" ETH balance: ", ethers.utils.formatEther(balance));
  await getErc20Balance(wethTokenAddress, deployer);
  await getErc20Balance(usdtAddress, deployer);

  const lendingPool = await getLendingPool(deployer);

  // deposit!
  // approve
  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
  console.log("Depositing...");
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer.address, 0);
  console.log("Deposited!");

  console.log("Pidiendo prestado USDT");
  const borrow = "500000";
  await borrowErc20(usdtAddress, lendingPool, borrow, deployer);

  const midBalance = await deployer.getBalance();
  console.log("ETH balance: ", ethers.utils.formatEther(midBalance));
  await getErc20Balance(wethTokenAddress, deployer);
  const usdtBalance = await getErc20Balance(usdtAddress, deployer);

  console.log("Aprobando todo el usdt: ", usdtBalance);
  await approveErc20(usdtAddress, lendingPool.address, usdtBalance, deployer);

  const collateralAddress = wethTokenAddress;
  const debt = usdtAddress;
  const userAddress = "0x5cd3D25Deb4773149c2b45acBBFEd59d180cC97F";
  const debtToCover = usdtBalance; /* ethers.utils.parseUnits("1.0", 18); */
  const receiveAToken = false;

  console.log("Getting victim data before liquidation...");
  await getBorrowUserData(lendingPool, userAddress);

  await liquidateUser(
    lendingPool,
    collateralAddress,
    debt,
    userAddress,
    debtToCover,
    receiveAToken
  );

  console.log("Getting victim data after liquidation...");
  await getBorrowUserData(lendingPool, userAddress);

  const newBalance = await deployer.getBalance();

  console.log(" ETH balance: ", ethers.utils.formatEther(newBalance));
  await getErc20Balance(wethTokenAddress, deployer);
}

async function borrowErc20(erc20Address, lendingPool, borrow, account) {
  const borrowtx = await lendingPool.borrow(erc20Address, borrow, 2, 0, account.address);
  await borrowtx.wait(1);
  console.log(`You've borrowed!`);
}

async function getWeth(erc20Address, account) {
  console.log("getWeth llamado");
  const iWeth = new ethers.Contract(erc20Address, erc20ABI.abi, account);

  console.log("Depositando ETH");
  const tx = await iWeth.deposit({ value: AMOUNT });
  await tx.wait(1);
  console.log("Obteniendo balance de ETH");
  const wethBalance = await iWeth.balanceOf(account.address);
  console.log(`Got ${wethBalance.toString()} WETH`);
}

async function getErc20Balance(erc20Address, account) {
  const erc20Contract = new ethers.Contract(erc20Address, erc20ABI.abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  const symbol = await erc20Contract.symbol();
  console.log(`${symbol} balance: ${balance.toString()}`);
  return balance.toString();
}

async function getLendingPool(account) {
  const lendingPool = new ethers.Contract(
    "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
    LendingPoolABI.abi,
    account
  );
  return lendingPool;
}

async function liquidateUser(
  lendingPool,
  collateralAddress,
  debt,
  userAddress,
  debtToCover,
  receiveAToken
) {
  console.log("Iniciando el llamado a liquidationCall");
  const liquidateTx = await lendingPool.liquidationCall(
    collateralAddress,
    debt,
    userAddress,
    debtToCover,
    receiveAToken
  );
  console.log("Terminado el llamado a liquidationCall");

  const response = await liquidateTx.wait(1);
  console.log(`You've Liquidated!`);
  console.log(response);
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

  console.log("Account: ", account);
  console.log(`Have ${totalCollateralETH} worth of ETH deposited.`);
  console.log(`Have ${totalDebtETH} worth of ETH borrowed.`);
  console.log(`Have ${availableBorrowsETH} worth of ETH.`);
  console.log(`His helthFactor is: ${formattedHF}.`);
}

/* async function getUserReserveData(lendingPool, asset, user) {
  const contract_address = "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d";
  const dataProvider = await ethers.getContractAt("IProtocolDataProvider", contract_address);
  const {} = await dataProvider.getUserReserveData(asset, user);

  console.log("Approved!");
  const {
    totalCollateralETH,
    totalDebtETH,
    availableBorrowsETH,
    healthFactor
  } = await lendingPool.getUserAccountData(account);

  const formattedHF = parseFloat(ethers.utils.formatEther(healthFactor));

  if (formattedHF < 2) {
    console.log("Account: ", account);
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
    console.log(`You have ${availableBorrowsETH} worth of ETH.`);
    console.log(`Your helthFactor is: ${ethers.utils.formatEther(healthFactor)}.`);

    const info = [
      {
        user: account,
        totalCollateralETH: totalCollateralETH,
        totalDebtETH: totalDebtETH,
        availableBorrowsETH: availableBorrowsETH,
        healthFactor: healthFactor,
        formattedHF: formattedHF
      }
    ];

    
  }
} */

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
