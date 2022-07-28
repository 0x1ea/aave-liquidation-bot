const { ethers } = require("ethers");

async function getWeth(address, abi, account, amount, gasPrice) {
  const erc20Contract = new ethers.Contract(address, abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  await erc20Contract.deposit({
    value: amount,
    gasLimit: "60041",
    gasPrice: gasPrice
  });
  return balance.toString();
}

async function approveErc20(
  erc20Address,
  abi,
  spenderAddress,
  amountToSpend,
  account,
  gasPrice
) {
  const erc20Token = new ethers.Contract(erc20Address, abi, account);
  await erc20Token.approve(spenderAddress, amountToSpend, {
    gasLimit: "63000",
    gasPrice: gasPrice
  });
}

async function getErc20Balance(erc20Address, abi, account) {
  const erc20Contract = new ethers.Contract(erc20Address, abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  // const symbol = await erc20Contract.symbol();
  // const decimals = await erc20Contract.decimals();
  // console.log(`My ${symbol} balance: ${ethers.utils.formatUnits(balance, decimals)}`);
  return balance.toString();
}

async function swapTokens(address, abi, account, params, gasPrice) {
  const uniswapRouter = new ethers.Contract(address, abi, account);
  await uniswapRouter.exactInputSingle(params, {
    gasLimit: "350000",
    gasPrice: gasPrice
  });
}

async function getBorrowUserData(lendingPool, account) {
  const {
    totalCollateralETH,
    totalDebtETH,
    healthFactor
  } = await lendingPool.getUserAccountData(account);

  const formattedHF = parseFloat(ethers.utils.formatEther(healthFactor));

  // console.log("\nAccount: ", account);
  // console.log(
  //   `Have ${ethers.utils.formatEther(totalCollateralETH)} worth of ETH deposited.`
  // );
  // console.log(`Have ${ethers.utils.formatEther(totalDebtETH)} worth of ETH borrowed.`);
  // console.log(`His helthFactor is: ${formattedHF}.\n`);

  return { formattedHF, totalCollateralETH, totalDebtETH };
}

async function getEth(address, abi, account, gasPrice) {
  const erc20Contract = new ethers.Contract(address, abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  await erc20Contract.withdraw(balance, {
    gasLimit: "37041",
    gasPrice: gasPrice
  });
  return balance.toString();
}

async function getLendingPool(address, abi, account) {
  const lendingPool = new ethers.Contract(address, abi, account);
  return lendingPool;
}

async function liquidateUser(
  lendingPool,
  collateralAddress,
  debt,
  VICTIM_ADDRESS,
  debtToCover,
  receiveAToken,
  gasPrice
) {
  await lendingPool.liquidationCall(
    collateralAddress,
    debt,
    VICTIM_ADDRESS,
    debtToCover,
    receiveAToken,
    { gasPrice: gasPrice, gasLimit: "800000" }
  );
  // console.log(`- Done!\n\n`);
}

async function getPrice(address, abi, account, baseTokenAddress) {
  const contract = new ethers.Contract(address, abi, account);
  let price = await contract.getAssetPrice(baseTokenAddress);
  return price.toString();
}

module.exports = {
  approveErc20,
  getErc20Balance,
  swapTokens,
  getBorrowUserData,
  getEth,
  getLendingPool,
  liquidateUser,
  getPrice,
  getWeth
};
