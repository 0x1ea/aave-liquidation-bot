// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/ILendingPool.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IWeth.sol";

contract Liquidator {
  address public owner;
  address public WETH_ADDRESS;
  address public SWAPROUTER_ADDRESS;
  address public LENDINGPOOL_ADDRESS;
  uint256 public outputAmount;
  uint256 public outputWethAmount;

  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  constructor(
    address _weth,
    address _swapRouter,
    address _lendingPool
  ) {
    owner = msg.sender;
    WETH_ADDRESS = _weth;
    SWAPROUTER_ADDRESS = _swapRouter;
    LENDINGPOOL_ADDRESS = _lendingPool;
  }

  function liquidate(
    address debtAddress,
    address colAddress,
    address victim
  ) public payable onlyOwner returns (bool) {
    require(msg.value != 0);

    ISwapRouter swapRouter = ISwapRouter(SWAPROUTER_ADDRESS);
    IWeth weth = IWeth(WETH_ADDRESS);

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

  function withdraw(IWeth _token, uint256 _amount) public onlyOwner {
    _token.transfer(msg.sender, _amount);
  }
}
