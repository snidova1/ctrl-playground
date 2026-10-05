// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
/// @notice Disposable integration fixture. Not the production CTRL token.
contract CTRLTestToken {
    string public constant name = "CTRL Testnet";
    string public constant symbol = "tCTRL";
    uint8 public constant decimals = 18;
    uint256 public constant CAP = 1_000_000_000 ether;
    uint256 public constant CLAIM = 64_000 ether;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public claimed;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    constructor() {
        require(block.chainid == 46630, "TESTNET_ONLY");
        claimed[msg.sender] = true;
        _mint(msg.sender, CLAIM);
    }
    function claim() external {
        require(!claimed[msg.sender], "ALREADY_CLAIMED");
        claimed[msg.sender] = true;
        _mint(msg.sender, CLAIM);
    }
    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value); return true;
    }
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value); return true;
    }
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 available = allowance[from][msg.sender];
        if (available != type(uint256).max) {
            require(available >= value, "ALLOWANCE");
            allowance[from][msg.sender] = available - value;
        }
        _transfer(from, to, value); return true;
    }
    function _transfer(address from, address to, uint256 value) private {
        require(to != address(0), "ZERO_ADDRESS");
        require(balanceOf[from] >= value, "BALANCE");
        balanceOf[from] -= value; balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
    function _mint(address to, uint256 value) private {
        require(totalSupply + value <= CAP, "CAP");
        totalSupply += value; balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
}
