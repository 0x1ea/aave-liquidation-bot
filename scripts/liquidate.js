const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");

async function main() {
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  await getWeth();

  const { deployer } = await getNamedAccounts();
  console.log(deployer);
  const balance = await ethers.provider.getBalance(deployer);
  console.log(" ETH balance: ", ethers.utils.formatEther(balance));
  await getWethBalance(deployer);

  const lendingPool = await getLendingPool(deployer);

  // deposit!
  // approve
  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);

  const collateralAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const debt = wethTokenAddress;
  const userAddress = "0x5cd3D25Deb4773149c2b45acBBFEd59d180cC97F";
  const debtToCover = ethers.utils.parseUnits("1.0", 18);
  const receiveAToken = false;

  console.log(debtToCover.toString());

  console.log("Getting victim before data...");
  await getBorrowUserData(lendingPool, userAddress);

  await liquidateUser(
    lendingPool,
    collateralAddress,
    debt,
    userAddress,
    debtToCover,
    receiveAToken
  );

  console.log("Getting victim before data...");
  await getBorrowUserData(lendingPool, userAddress);

  const newBalance = await ethers.provider.getBalance(deployer);
  console.log(" ETH balance: ", ethers.utils.formatEther(newBalance));
  await getWethBalance(deployer);
}

async function getWethBalance(account) {
  const iWeth = await ethers.getContractAt("IWeth", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  const wethBalance = await iWeth.balanceOf(account);
  console.log(`Weth balance: ${ethers.utils.formatEther(wethBalance)} WETH`);
}

async function getLendingPool(account) {
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  );

  const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account);
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
  const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account);
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
