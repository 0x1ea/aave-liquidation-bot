// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/ILendingPool.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IWeth.sol";

contract Liquidator {
  address public WETH_ADDRESS = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270; // 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
  address public SWAPROUTER_ADDRESS = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
  address public LENDINGPOOL_ADDRESS = 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf; // 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9;
  uint256 public outputAmount;
  uint256 public outputWethAmount;

  ISwapRouter swapRouter = ISwapRouter(SWAPROUTER_ADDRESS);
  IWeth weth = IWeth(WETH_ADDRESS);

  function liquidate(
    address debtAddress,
    address colAddress,
    address victim
  ) public payable returns (bool) {
    (bool success, bytes memory data) = WETH_ADDRESS.call{value: msg.value}("");

    if (debtAddress != WETH_ADDRESS) {
      weth.approve(SWAPROUTER_ADDRESS, msg.value);

      ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
        .ExactInputSingleParams({
          tokenIn: WETH_ADDRESS,
          tokenOut: address(debtAddress),
          fee: 3000,
          recipient: address(this),
          deadline: block.timestamp,
          amountIn: msg.value,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0
        });

      outputAmount = swapRouter.exactInputSingle(params);
    } else {
      outputAmount = msg.value;
    }

    IWeth debtToken = IWeth(debtAddress);
    debtToken.approve(LENDINGPOOL_ADDRESS, outputAmount);

    ILendingPool lendingPool = ILendingPool(LENDINGPOOL_ADDRESS);
    lendingPool.liquidationCall(colAddress, debtAddress, victim, outputAmount, false);

    if (colAddress != WETH_ADDRESS) {
      IWeth colToken = IWeth(colAddress);

      uint256 colBalance = colToken.balanceOf(address(this));
      colToken.approve(SWAPROUTER_ADDRESS, colBalance);

      ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
        .ExactInputSingleParams({
          tokenIn: colAddress,
          tokenOut: WETH_ADDRESS,
          fee: 3000,
          recipient: msg.sender,
          deadline: block.timestamp,
          amountIn: colBalance,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0
        });

      outputWethAmount = swapRouter.exactInputSingle(params);
    } else {
      uint256 wethBalance = weth.balanceOf(address(this));
      weth.transfer(msg.sender, wethBalance);
    }
    return success;
  }
}
