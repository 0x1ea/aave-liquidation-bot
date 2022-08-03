const { expect } = require("chai");
const hre = require("hardhat");
require("dotenv").config();

const uniswap = require("../config/uniswap.json");
const aave = require("../config/aave.json");

const CHAIN = "mainnet";
const WETH_ADDRESS = aave[CHAIN].iWeth.address;
const SWAPROUTER_ADDRESS = uniswap[CHAIN].swapRouter.address;
const LENDINGPOOL_ADDRESS = aave[CHAIN].v2.lendingPool.address;

describe("Liquidator", function () {
  it("Should deploy contract", async function () {
    const Liquidator = await hre.ethers.getContractFactory("Liquidator");
    const liquidator = await Liquidator.deploy(
      WETH_ADDRESS,
      SWAPROUTER_ADDRESS,
      LENDINGPOOL_ADDRESS
    );

    await liquidator.deployed();

    // console.log(`Liquidator deployed to ${liquidator.address}`);
    expect(await liquidator.owner()).to.equal(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    );
  });
});
