// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/MockSwapRouter.sol";
import "../src/MockToken.sol";

contract MockSwapRouterTest is Test {
  MockSwapRouter public swapRouter;
  MockToken public tokenA;
  MockToken public tokenB;
  address public user = address(1);

  function setUp() public {
    swapRouter = new MockSwapRouter();
    tokenA = new MockToken("TokenA", 18);
    tokenB = new MockToken("TokenB", 18);

    // Mint tokens
    tokenA.mint(user, 1_000 ether);
    tokenB.mint(address(swapRouter), 1_000 ether);

    // Provide ETH to user
    vm.deal(user, 1_000 ether);
    vm.deal(address(swapRouter), 1_000 ether);

    // Label for clarity
    vm.label(user, "User");
    vm.label(address(tokenA), "TokenA");
    vm.label(address(tokenB), "TokenB");
  }

  // -------- token -> token --------
  function testExactInputSingle_TokenToToken() public {
    vm.startPrank(user);

    uint256 amountIn = 100 ether;
    uint256 amountOutMinimum = 200 ether;

    tokenA.approve(address(swapRouter), amountIn);

    uint256 amountOut = swapRouter.exactInputSingle(
      MockSwapRouter.ExactInputSingleParams({
        tokenIn: address(tokenA),
        tokenOut: address(tokenB),
        fee: 0,
        recipient: user,
        deadline: block.timestamp + 1 hours,
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum,
        sqrtPriceLimitX96: 0
      })
    );

    assertEq(amountOut, amountOutMinimum, "Incorrect amountOut");
    assertEq(
      tokenB.balanceOf(user),
      amountOutMinimum,
      "Incorrect tokenB balance"
    );
    assertEq(
      tokenA.balanceOf(user),
      1_000 ether - amountIn,
      "Incorrect tokenA balance"
    );

    vm.stopPrank();
  }

  function testExactOutputSingle_TokenToToken() public {
    vm.startPrank(user);

    uint256 amountOut = 200 ether;
    uint256 amountInMaximum = 100 ether;

    tokenA.approve(address(swapRouter), amountInMaximum);

    uint256 amountIn = swapRouter.exactOutputSingle(
      MockSwapRouter.ExactOutputSingleParams({
        tokenIn: address(tokenA),
        tokenOut: address(tokenB),
        fee: 0,
        recipient: user,
        deadline: block.timestamp + 1 hours,
        amountOut: amountOut,
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: 0
      })
    );

    assertEq(amountIn, amountInMaximum, "Incorrect amountIn");
    assertEq(tokenB.balanceOf(user), amountOut, "Incorrect tokenB balance");
    assertEq(
      tokenA.balanceOf(user),
      1_000 ether - amountInMaximum,
      "Incorrect tokenA balance"
    );

    vm.stopPrank();
  }

  // -------- token -> ETH --------
  function testExactInputSingle_TokenToETH() public {
    vm.startPrank(user);

    uint256 amountIn = 1 ether;
    uint256 amountOutMinimum = 2 ether;

    tokenA.approve(address(swapRouter), amountIn);

    uint256 userEthBefore = user.balance;

    uint256 amountOut = swapRouter.exactInputSingle(
      MockSwapRouter.ExactInputSingleParams({
        tokenIn: address(tokenA),
        tokenOut: address(0), // ETH out
        fee: 0,
        recipient: user,
        deadline: block.timestamp + 1 hours,
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum,
        sqrtPriceLimitX96: 0
      })
    );

    assertEq(amountOut, amountOutMinimum, "Incorrect amountOut");
    assertEq(
      user.balance,
      userEthBefore + amountOutMinimum,
      "Incorrect ETH balance"
    );
    assertEq(
      tokenA.balanceOf(user),
      1_000 ether - amountIn,
      "Incorrect tokenA balance"
    );

    vm.stopPrank();
  }

  function testExactOutputSingle_TokenToETH() public {
    vm.startPrank(user);

    uint256 amountOut = 2 ether;
    uint256 amountInMaximum = 1 ether;

    tokenA.approve(address(swapRouter), amountInMaximum);

    uint256 userEthBefore = user.balance;

    uint256 amountIn = swapRouter.exactOutputSingle(
      MockSwapRouter.ExactOutputSingleParams({
        tokenIn: address(tokenA),
        tokenOut: address(0), // ETH out
        fee: 0,
        recipient: user,
        deadline: block.timestamp + 1 hours,
        amountOut: amountOut,
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: 0
      })
    );

    assertEq(amountIn, amountInMaximum, "Incorrect amountIn");
    assertEq(user.balance, userEthBefore + amountOut, "Incorrect ETH balance");
    assertEq(
      tokenA.balanceOf(user),
      1_000 ether - amountInMaximum,
      "Incorrect tokenA balance"
    );

    vm.stopPrank();
  }

  // -------- ETH -> token --------
  function testExactInputSingle_ETHToToken() public {
    vm.startPrank(user);

    uint256 amountIn = 1 ether;
    uint256 amountOutMinimum = 2 ether;

    uint256 userEthBefore = user.balance;

    uint256 amountOut = swapRouter.exactInputSingle{value: amountIn}(
      MockSwapRouter.ExactInputSingleParams({
        tokenIn: address(0), // ETH in
        tokenOut: address(tokenB),
        fee: 0,
        recipient: user,
        deadline: block.timestamp + 1 hours,
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum,
        sqrtPriceLimitX96: 0
      })
    );

    assertEq(amountOut, amountOutMinimum, "Incorrect amountOut");
    assertEq(user.balance, userEthBefore - amountIn, "Incorrect ETH balance");
    assertEq(
      tokenB.balanceOf(user),
      amountOutMinimum,
      "Incorrect tokenB balance"
    );

    vm.stopPrank();
  }

  function testExactOutputSingle_ETHToToken() public {
    vm.startPrank(user);

    uint256 amountOut = 2 ether;
    uint256 amountInMaximum = 1 ether;

    uint256 userEthBefore = user.balance;

    uint256 amountIn = swapRouter.exactOutputSingle{value: amountInMaximum}(
      MockSwapRouter.ExactOutputSingleParams({
        tokenIn: address(0), // ETH in
        tokenOut: address(tokenB),
        fee: 0,
        recipient: user,
        deadline: block.timestamp + 1 hours,
        amountOut: amountOut,
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: 0
      })
    );

    assertEq(amountIn, amountInMaximum, "Incorrect amountIn");
    assertEq(
      user.balance,
      userEthBefore - amountInMaximum,
      "Incorrect ETH balance"
    );
    assertEq(tokenB.balanceOf(user), amountOut, "Incorrect tokenB balance");

    vm.stopPrank();
  }
}
