//SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken2 is ERC20 {
  uint8 decimals_;

  constructor(
    string memory name,
    string memory symbol,
    uint8 decimals__
  ) ERC20(name, symbol) {
    decimals_ = decimals__;
  }

  // decimals returns the number of decimals.
  function decimals() public view override returns (uint8) {
    return decimals_;
  }

  function mint(address account, uint256 amount) public {
    _mint(account, amount);
  }

  function burn(address account, uint256 amount) public {
    _burn(account, amount);
  }
}
