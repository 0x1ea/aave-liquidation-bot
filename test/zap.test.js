require("dotenv").config();
const { expect, assert } = require("chai");
const hre = require("hardhat");
const uniswap = require("../config/uniswap.json");
const aave = require("../config/aave.json");
const { BigNumber } = require("ethers");

describe("LiquidatorZap Unit Testing", function () {
  const CHAIN = "mainnet";
  const WETH_ADDRESS = aave[CHAIN].iWeth.address;
  const WETH_ABI = aave[CHAIN].iWeth.abi;
  const SWAPROUTER_ADDRESS = uniswap[CHAIN].swapRouter.address;
  const LENDINGPOOL_ADDRESS = aave[CHAIN].v2.lendingPool.address;
  let liquidator, weth, owner;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    const Liquidator = await hre.ethers.getContractFactory("Liquidator");
    liquidator = await Liquidator.deploy(
      WETH_ADDRESS,
      SWAPROUTER_ADDRESS,
      LENDINGPOOL_ADDRESS
    );
    weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, owner);
  });

  describe("constructor", function () {
    it("intitiallizes the liquidatorZap correctly", async () => {
      const owner = await liquidator.owner();
      assert.equal(owner, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    });
  });

  describe("liquidate method", function () {
    it("Reverts when you send 0 ether", async () => {
      await expect(
        liquidator.liquidate(
          "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          "0x9bE5D213245be984C0fB806a1d92C03a05448A4D"
        )
      ).to.be.reverted;
    });

    it("Should liquidate a user with eth as collateral", async () => {
      await liquidator.liquidate(
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "0x9bE5D213245be984C0fB806a1d92C03a05448A4D",
        { value: "39783252790076879" }
      );
      dai = new ethers.Contract(
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        WETH_ABI,
        owner
      );
      daiBalance = await dai.balanceOf(liquidator.address);
      weth = new ethers.Contract(
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        WETH_ABI,
        owner
      );
      wethBalance = await weth.balanceOf(liquidator.address);
      assert.equal(daiBalance.toString(), "0");
      assert.equal(wethBalance.toString(), "0");

      const balance = await weth.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
      expect(balance).to.be.equal("41623442903200174");
    });

    it("Should liquidate a user without eth as collateral", async () => {
      let balance = await weth.balanceOf(owner.address);
      // console.log(balance.toString());
      await weth.withdraw(balance, {
        from: owner.address,
      });
      balance = await weth.balanceOf(owner.address);
      // console.log(balance.toString());
      assert.equal(balance.toString(), "0");

      dai = new ethers.Contract(
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        WETH_ABI,
        owner
      );
      daiBalance = await dai.balanceOf(liquidator.address);
      aaveContract = new ethers.Contract(
        "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        WETH_ABI,
        owner
      );
      aaveBalance = await aaveContract.balanceOf(liquidator.address);
      assert.equal(daiBalance.toString(), "0");
      assert.equal(aaveBalance.toString(), "0");

      await liquidator.liquidate(
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        "0x9bE5D213245be984C0fB806a1d92C03a05448A4D",
        { value: "1996256594657461" }
      );

      balance = await weth.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
      // console.log(balance.toString());
      const resultIsBigger = BigNumber.from("1996256594657461").lt(balance);
      assert.equal(resultIsBigger, true);
    });

    it("Should liquidate a user with eth as debt", async () => {
      let balance = await weth.balanceOf(owner.address);
      await weth.withdraw(balance, {
        from: owner.address,
      });
      balance = await weth.balanceOf(owner.address);
      assert.equal(balance.toString(), "0");

      await liquidator.liquidate(
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "0x855C37a0711481c27Ff8C28B93bb0c991f45d01e",
        { value: "1996256594657461" }
      );

      balance = await weth.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
      const resultIsBigger = BigNumber.from("1996256594657461").lt(balance);
      assert.equal(resultIsBigger, true);
    });
  });

  describe("withdraw method", function () {
    it("Should send you the ERC20 token provided", async () => {
      let balance = await weth.balanceOf(owner.address);
      await weth.withdraw(balance, {
        from: owner.address,
      });
      balance = await weth.balanceOf(owner.address);
      assert.equal(balance, "0");

      await weth.deposit({ value: "100000000000000000", from: owner.address });

      await weth.transfer(liquidator.address, "100000000000000000", {
        from: owner.address,
      });
      await liquidator.withdraw(WETH_ADDRESS, "100000000000000000", {
        from: owner.address,
      });
      balance = await weth.balanceOf(owner.address);
      expect(balance).to.be.equal("100000000000000000");
    });
  });
});
