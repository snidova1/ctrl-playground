// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @dev Local-only fake deployment. Valid constants must not hide an unsafe ID binding.
contract OwnerBindingFixture {
    address public immutable ctrl;
    address public immutable developmentTreasury;
    uint256 public constant FEE_BPS = 300;
    constructor(address token, address treasury) {
        ctrl = token;
        developmentTreasury = treasury;
    }
    function worldIdFor(address) external pure returns(bytes32) { return bytes32(0); }
}

/// @dev Local-only legacy ABI without worldIdFor; reads must fail closed.
contract LegacyKeysFixture {
    address public immutable ctrl;
    address public immutable developmentTreasury;
    uint256 public constant FEE_BPS = 300;
    constructor(address token, address treasury) {
        ctrl = token;
        developmentTreasury = treasury;
    }
}
