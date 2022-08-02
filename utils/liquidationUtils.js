const { ethers } = require("ethers");

// Write functions
async function getWeth(address, abi, account, amount, gasPrice, nonce) {
  const erc20Contract = new ethers.Contract(address, abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  const tx = await erc20Contract.deposit({
    value: amount,
    gasLimit: "60041",
    gasPrice: gasPrice,
    nonce: nonce
  });
  await tx.wait(1);
  return new Promise(resolve => {
    resolve(balance);
  });
}

async function approveErc20(
  erc20Address,
  abi,
  spenderAddress,
  amountToSpend,
  account,
  gasPrice,
  nonce
) {
  const erc20Token = new ethers.Contract(erc20Address, abi, account);
  const tx = await erc20Token.approve(spenderAddress, amountToSpend, {
    gasLimit: "63000",
    gasPrice: gasPrice,
    nonce: nonce
  });
  await tx.wait(1);
  return new Promise(resolve => {
    resolve(tx);
  });
}

async function swapTokens(address, abi, account, params, gasPrice, nonce) {
  const uniswapRouter = new ethers.Contract(address, abi, account);
  const tx = await uniswapRouter.exactInputSingle(params, {
    gasLimit: "350000",
    gasPrice: gasPrice,
    nonce: nonce
  });
  await tx.wait(1);
  return new Promise(resolve => {
    resolve(tx);
  });
}

async function getEth(address, abi, account, gasPrice) {
  const erc20Contract = new ethers.Contract(address, abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  const tx = await erc20Contract.withdraw(balance, {
    gasLimit: "37041",
    maxFeePerGas: gasPrice.maxFeePerGas,
    maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
  });
  await tx.wait(1);
  return new Promise(resolve => {
    resolve(balance);
  });
}

async function liquidateUser(
  lendingPool,
  collateralAddress,
  debt,
  VICTIM_ADDRESS,
  debtToCover,
  receiveAToken,
  gasPrice,
  nonce
) {
  const tx = await lendingPool.liquidationCall(
    collateralAddress,
    debt,
    VICTIM_ADDRESS,
    debtToCover,
    receiveAToken,
    { gasPrice: gasPrice, gasLimit: "850000", nonce: nonce }
  );
  await tx.wait(1);
  return new Promise(resolve => {
    resolve(tx);
  });
}

// Read functions
async function getBorrowUserData(lendingPool, account, print) {
  const {
    totalCollateralETH,
    totalDebtETH,
    healthFactor
  } = await lendingPool.getUserAccountData(account);

  const formattedHF = parseFloat(ethers.utils.formatEther(healthFactor));
  if (print) {
    console.log("\nAccount: ", account);
    console.log(
      `Have ${ethers.utils.formatEther(totalCollateralETH)} worth of ETH deposited.`
    );
    console.log(`Have ${ethers.utils.formatEther(totalDebtETH)} worth of ETH borrowed.`);
    console.log(`His helthFactor is: ${formattedHF}.\n`);
  }

  return { formattedHF, totalCollateralETH, totalDebtETH };
}

async function getBorrowUserDataV3(lendingPool, account) {
  const {
    totalCollateralBase,
    totalDebtBase,
    healthFactor
  } = await lendingPool.getUserAccountData(account);

  const formattedHF = parseFloat(ethers.utils.formatEther(healthFactor));

  // console.log("\nAccount: ", account);
  // console.log(
  //   `Have ${ethers.utils.formatEther(totalCollateralETH)} worth of ETH deposited.`
  // );
  // console.log(`Have ${ethers.utils.formatEther(totalDebtETH)} worth of ETH borrowed.`);
  // console.log(`His helthFactor is: ${formattedHF}.\n`);

  return { formattedHF, totalCollateralBase, totalDebtBase };
}

async function getLendingPool(address, abi, account) {
  const lendingPool = new ethers.Contract(address, abi, account);
  return lendingPool;
}

async function getErc20Balance(erc20Address, abi, account) {
  const erc20Contract = new ethers.Contract(erc20Address, abi, account);
  const balance = await erc20Contract.balanceOf(account.address);
  // const symbol = await erc20Contract.symbol();
  // const decimals = await erc20Contract.decimals();
  // console.log(`My ${symbol} balance: ${ethers.utils.formatUnits(balance, decimals)}`);
  return balance;
}
async function getPrice(address, abi, account, baseTokenAddress) {
  const contract = new ethers.Contract(address, abi, account);
  let price = await contract.getAssetPrice(baseTokenAddress);
  return price;
}

module.exports = {
  approveErc20,
  getErc20Balance,
  swapTokens,
  getBorrowUserData,
  getBorrowUserDataV3,
  getEth,
  getLendingPool,
  liquidateUser,
  getPrice,
  getWeth
};
