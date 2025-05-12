// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockSwapRouter {
  address constant NATIVE_TOKEN = address(0);

  struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee; // not used in mock
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96; // not used in mock
  }

  struct ExactOutputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee; // not used in mock
    address recipient;
    uint256 deadline;
    uint256 amountOut;
    uint256 amountInMaximum;
    uint160 sqrtPriceLimitX96; // not used in mock
  }

  event Swap(
    address indexed sender,
    address indexed tokenIn,
    address indexed tokenOut,
    uint256 amountIn,
    uint256 amountOut,
    address recipient
  );

  function exactInputSingle(
    ExactInputSingleParams calldata params
  ) external payable returns (uint256 amountOut) {
    require(block.timestamp <= params.deadline, "Transaction expired");

    if (params.tokenIn == NATIVE_TOKEN) {
      // Handle native ETH input
      require(msg.value == params.amountIn, "Incorrect msg.value");
    } else {
      // ERC20 input
      require(
        IERC20(params.tokenIn).transferFrom(
          msg.sender,
          address(this),
          params.amountIn
        ),
        "Transfer tokenIn failed"
      );
    }

    if (params.tokenOut == NATIVE_TOKEN) {
      // Handle native ETH output
      (bool success, ) = params.recipient.call{value: params.amountOutMinimum}(
        ""
      );
      require(success, "Transfer native token failed");
    } else {
      // ERC20 output
      require(
        IERC20(params.tokenOut).transfer(
          params.recipient,
          params.amountOutMinimum
        ),
        "Transfer tokenOut failed"
      );
    }

    emit Swap(
      msg.sender,
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      params.amountOutMinimum,
      params.recipient
    );

    return params.amountOutMinimum;
  }

  function exactOutputSingle(
    ExactOutputSingleParams calldata params
  ) external payable returns (uint256 amountIn) {
    require(block.timestamp <= params.deadline, "Transaction expired");

    if (params.tokenIn == NATIVE_TOKEN) {
      // Handle native ETH input
      require(msg.value == params.amountInMaximum, "Incorrect msg.value");
    } else {
      // ERC20 input
      require(
        IERC20(params.tokenIn).transferFrom(
          msg.sender,
          address(this),
          params.amountInMaximum
        ),
        "Transfer tokenIn failed"
      );
    }

    if (params.tokenOut == NATIVE_TOKEN) {
      // Handle native ETH output
      (bool success, ) = params.recipient.call{value: params.amountOut}("");
      require(success, "Transfer native token failed");
    } else {
      // ERC20 output
      require(
        IERC20(params.tokenOut).transfer(params.recipient, params.amountOut),
        "Transfer tokenOut failed"
      );
    }

    emit Swap(
      msg.sender,
      params.tokenIn,
      params.tokenOut,
      params.amountInMaximum,
      params.amountOut,
      params.recipient
    );

    return params.amountInMaximum;
  }

  // Allow this contract to receive ETH
  receive() external payable {}
}
