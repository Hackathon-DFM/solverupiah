// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {Hyperlane7683} from "../src/Hyperlane7683.sol";
import {TypeCasts} from "@hyperlane-xyz/libs/TypeCasts.sol";
import {OrderData, OrderEncoder} from "../src/libs/OrderEncoder.sol";
import {GaslessCrossChainOrder, OnchainCrossChainOrder, ResolvedCrossChainOrder, Output, FillInstruction} from "../src/ERC7683/IERC7683.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPermit2, ISignatureTransfer} from "@uniswap/permit2/src/interfaces/IPermit2.sol";
import {IEIP712} from "@uniswap/permit2/src/interfaces/IEIP712.sol";
import {MockToken} from "../src/MockToken.sol";

contract OpenForIntentScript is Script {
  // Hyperlane7683 routerArbi;
  using TypeCasts for address;

  uint256 constant senderPk =
    0xf7d70edb80ad7feef3a5595a46cfd6c9d47cae6e453edc6df8cb5ae8953c76bd;
  uint256 constant solverPk =
    0x9df556c5b59fc38cc2fbee7db4c30d3719d7c20fd38ca788784e3b7aa2edb792;

  address constant originRouterAddress =
    0x1EeaF4f3b82b4f6BbF968B2dAE9Fb60edD1b6Ede;
  address constant destinationRouterAddress =
    0x8Bbe61f95364FEa284C6c01866dfe9D513f1E456;

  uint32 constant originChainId = 421614;
  uint32 constant destinationChainId = 4202;

  address constant inputTokenAddress =
    0xcb46D923b502e87598e4FCB37211CD217c61002E;
  address constant outputTokenAddress =
    0x6755309CC9bd08c235459c94d3811A4E57A023E7;

  address constant permit2Address = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

  bytes32 DOMAIN_SEPARATOR;

  function run() external {
    // uint256 forkId = vm.createFork(
    //   "https://arbitrum-sepolia-rpc.publicnode.com"
    // );
    // vm.selectFork(forkId);

    vm.startBroadcast(senderPk);
    DOMAIN_SEPARATOR = IEIP712(permit2Address).DOMAIN_SEPARATOR();

    address senderAddr = vm.addr(senderPk);
    address solverAddr = vm.addr(solverPk);

    console.log("Sender address: ", senderAddr);
    console.log("Solver address: ", solverAddr);

    Hyperlane7683 originRouter = Hyperlane7683(originRouterAddress);
    Hyperlane7683 destinationRouter = Hyperlane7683(destinationRouterAddress);

    address mailboxAddress = address(originRouter.mailbox());
    console.log("Mailbox address: ", mailboxAddress);

    IERC20 inputToken = IERC20(inputTokenAddress);
    IERC20 outputToken = IERC20(outputTokenAddress);

    // -------- Balance Check -------- //

    MockToken(inputTokenAddress).mint(senderAddr, 100000 ether);
    MockToken(inputTokenAddress).mint(solverAddr, 100000 ether);
    // MockToken(outputTokenAddress).mint(solverAddr, 100000 ether);
    // MockToken(outputTokenAddress).mint(senderAddr, 100000 ether);

    uint256 amount = 10 ether;

    console.log(
      "Sender balance: ",
      inputToken.balanceOf(senderAddr) / 1e18
    );
    console.log(
      "Solver balance: ",
      inputToken.balanceOf(solverAddr) / 1e18
    );
    console.log(
        "Transfer Amount: ",
        amount / 1e18
    );

    // -------- Create a new order -------- //


    OrderData memory orderData = OrderData({
      sender: TypeCasts.addressToBytes32(senderAddr),
      recipient: TypeCasts.addressToBytes32(senderAddr),
      inputToken: TypeCasts.addressToBytes32(address(inputToken)),
      outputToken: TypeCasts.addressToBytes32(address(outputToken)),
      amountIn: amount,
      amountOut: amount,
      senderNonce: 1,
      originDomain: originChainId,
      destinationDomain: destinationChainId,
      destinationSettler: address(destinationRouter).addressToBytes32(),
      fillDeadline: uint32(block.timestamp + 100),
      data: new bytes(0)
    });

    // GaslessCrossChainOrder memory order = _prepareGaslessOrder(
    //   OrderEncoder.encode(orderData),
    //   permitNonce,
    //   openDeadline,
    //   orderData.fillDeadline
    // );

    uint256 permitNonce = 0;
    uint32 openDeadline = type(uint32).max;
    // uint32 openDeadline = uint32(block.timestamp + 10);

    GaslessCrossChainOrder memory order = GaslessCrossChainOrder({
      originSettler: originRouterAddress,
      user: senderAddr,
      nonce: permitNonce,
      originChainId: originChainId,
      openDeadline: openDeadline,
      fillDeadline: orderData.fillDeadline,
      orderDataType: OrderEncoder.orderDataType(),
      orderData: OrderEncoder.encode(orderData)
    });

    // ----------- approve permit2 ----------- //

    // check allowance 
    console.log(
      "Allowance before: ",
      inputToken.allowance(senderAddr, permit2Address) / 1e18
    );

    inputToken.approve(permit2Address, type(uint256).max);

    console.log(
        "Allowance after: ",
        inputToken.allowance(senderAddr, permit2Address) / 1e18
    );

    bytes32 witness = originRouter.witnessHash(
      originRouter.resolveFor(order, new bytes(0))
    );

    bytes memory sig = _getSignature(
      address(originRouter),
      witness,
      address(inputToken),
      permitNonce,
      amount,
      openDeadline,
      senderPk
    );
    vm.stopBroadcast();

    // --------- open order for intent --------- //
    vm.startBroadcast(solverPk);

    // check balance sender
    console.log(
      "Sender balance before: ",
      inputToken.balanceOf(senderAddr) / 1e18
    );

    originRouter.openFor(order, sig, new bytes(0));

    vm.stopBroadcast();
  }

  function _getSignature(
    address spender,
    bytes32 witness,
    address token,
    uint256 permitNonce,
    uint256 _amount,
    uint32 _deadline,
    uint256 sigPk
  ) internal view returns (bytes memory sig) {
    address[] memory tokens = new address[](1);
    tokens[0] = token;
    ISignatureTransfer.PermitBatchTransferFrom
      memory permit = _defaultERC20PermitMultiple(
        tokens,
        permitNonce,
        _amount,
        _deadline
      );

    return
      _getPermitBatchWitnessSignature(
        spender,
        permit,
        sigPk,
        FULL_WITNESS_BATCH_TYPEHASH,
        witness,
        DOMAIN_SEPARATOR
      );
  }

  function _defaultERC20PermitMultiple(
    address[] memory tokens,
    uint256 nonce,
    uint256 _amount,
    uint32 _deadline
  ) internal pure returns (ISignatureTransfer.PermitBatchTransferFrom memory) {
    ISignatureTransfer.TokenPermissions[]
      memory permitted = new ISignatureTransfer.TokenPermissions[](
        tokens.length
      );
    for (uint256 i = 0; i < tokens.length; ++i) {
      permitted[i] = ISignatureTransfer.TokenPermissions({
        token: tokens[i],
        amount: _amount
      });
    }
    return
      ISignatureTransfer.PermitBatchTransferFrom({
        permitted: permitted,
        nonce: nonce,
        deadline: _deadline
      });
  }

  function _getPermitBatchWitnessSignature(
    address spender,
    ISignatureTransfer.PermitBatchTransferFrom memory permit,
    uint256 privateKey,
    bytes32 typeHash,
    bytes32 witness,
    bytes32 domainSeparator
  ) internal pure returns (bytes memory sig) {
    bytes32[] memory tokenPermissions = new bytes32[](permit.permitted.length);
    for (uint256 i = 0; i < permit.permitted.length; ++i) {
      tokenPermissions[i] = keccak256(
        abi.encode(_TOKEN_PERMISSIONS_TYPEHASH, permit.permitted[i])
      );
    }

    bytes32 msgHash = keccak256(
      abi.encodePacked(
        "\x19\x01",
        domainSeparator,
        keccak256(
          abi.encode(
            typeHash,
            keccak256(abi.encodePacked(tokenPermissions)),
            spender,
            permit.nonce,
            permit.deadline,
            witness
          )
        )
      )
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, msgHash);
    return bytes.concat(r, s, bytes1(v));
  }

  bytes32 constant _TOKEN_PERMISSIONS_TYPEHASH =
    keccak256("TokenPermissions(address token,uint256 amount)");

  bytes32 constant FULL_WITNESS_TYPEHASH =
    keccak256(
      "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,ResolvedCrossChainOrder witness)ResolvedCrossChainOrder(address user, uint64 originChainId, uint32 openDeadline, uint32 fillDeadline, Output[] maxSpent, Output[] minReceived, FillInstruction[] fillInstructions)Output(bytes32 token, uint256 amount, bytes32 recipient, uint64 chainId)FillInstruction(uint64 destinationChainId, bytes32 destinationSettler, bytes originData)"
    );

  bytes32 constant FULL_WITNESS_BATCH_TYPEHASH =
    keccak256(
      "PermitBatchWitnessTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline,ResolvedCrossChainOrder witness)ResolvedCrossChainOrder(address user, uint64 originChainId, uint32 openDeadline, uint32 fillDeadline, Output[] maxSpent, Output[] minReceived, FillInstruction[] fillInstructions)Output(bytes32 token, uint256 amount, bytes32 recipient, uint64 chainId)FillInstruction(uint64 destinationChainId, bytes32 destinationSettler, bytes originData)TokenPermissions(address token,uint256 amount)"
    );

}
