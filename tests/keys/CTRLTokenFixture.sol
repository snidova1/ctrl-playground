// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @dev Local-only adversarial ERC20 fixture. Never a production CTRL token.
contract CTRLTokenFixture {
    enum Mode { Normal, FalseReturn, RevertCall, NoOp, ShortCredit, ExtraDebit, ReenterCatch, ReenterBubble, EmptyReturn }
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    Mode public incomingMode;
    Mode public outgoingMode;
    address public outgoingTarget;
    address public callbackTarget;
    bytes public callbackData;
    uint256 public callbackAttempts;
    bool public callbackSucceeded;
    bytes public callbackResult;

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    function configure(Mode incoming, Mode outgoing, address target) external {
        incomingMode = incoming;
        outgoingMode = outgoing;
        outgoingTarget = target;
    }
    function setCallback(address target, bytes calldata data) external {
        callbackTarget = target;
        callbackData = data;
        callbackAttempts = 0;
        callbackSucceeded = false;
        delete callbackResult;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, 'ALLOWANCE');
        allowance[from][msg.sender] -= amount;
        return move(from, to, amount, incomingMode);
    }
    function transfer(address to, uint256 amount) external returns (bool) {
        Mode mode = outgoingTarget == address(0) || to == outgoingTarget ? outgoingMode : Mode.Normal;
        return move(msg.sender, to, amount, mode);
    }
    function move(address from, address to, uint256 amount, Mode mode) private returns (bool) {
        if (mode == Mode.FalseReturn) return false;
        require(mode != Mode.RevertCall, 'TOKEN_REVERT');
        if (mode == Mode.NoOp) return true;
        uint256 debit = amount + (mode == Mode.ExtraDebit ? 1 : 0);
        require(balanceOf[from] >= debit, 'TOKEN_BALANCE');
        balanceOf[from] -= debit;
        balanceOf[to] += mode == Mode.ShortCredit && amount > 0 ? amount - 1 : amount;
        if (mode == Mode.ReenterCatch || mode == Mode.ReenterBubble) {
            callbackAttempts++;
            (bool success, bytes memory result) = callbackTarget.call(callbackData);
            callbackSucceeded = success;
            callbackResult = result;
            if (mode == Mode.ReenterBubble && !success) {
                assembly { revert(add(result, 32), mload(result)) }
            }
        }
        if (mode == Mode.EmptyReturn) {
            assembly { return(0, 0) }
        }
        return true;
    }
}
