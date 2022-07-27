// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.10;

import "./interfaces/IERC20.sol";
import "./interfaces/ILendingPool.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IWeth.sol";

contract Liquidator {
  address WETH = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
  address swapRouterAddress = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
  address lendingPool = 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf;

  uint256 public outputValue;

  function liquidate() public payable returns (bool) {
    //   function liquidate(ISwapRouter.ExactInputSingleParams memory params) payable public {
    IWeth weth = IWeth(WETH);
    (bool success, bytes memory data) = WETH.call{value: msg.value}("");

    weth.approve(swapRouterAddress, msg.value);

    //   ISwapRouter swapRouter = ISwapRouter(swapRouterAddress);

    //   uint256 outputAmount = swapRouter.exactInputSingle(params);

    // outputValue = outputAmount;
    return success;
  }

  function getValue() public view returns (uint256) {
    return outputValue;
  }
}
