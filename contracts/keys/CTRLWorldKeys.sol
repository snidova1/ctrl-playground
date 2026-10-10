// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
interface ICTRLToken {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
/// @notice Unaudited implementation candidate. No public-chain deployment yet.
/// Owner key is non-redeemable. Membership units are bought/sold against CTRL reserves.
contract CTRLWorldKeys {
    ICTRLToken public immutable ctrl;
    address public immutable developmentTreasury;
    uint256 public immutable curveUnit;
    uint256 public constant FEE_BPS = 300;
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 private entered;
    struct World { address owner; uint256 supply; uint256 reserve; }
    mapping(bytes32 => World) public worlds;
    mapping(address => bytes32) public ownerWorld;
    mapping(bytes32 => mapping(address => uint256)) public balanceOf;
    event WorldCreated(bytes32 indexed worldId, address indexed owner);
    event Trade(bytes32 indexed worldId, address indexed trader, bool buy, uint256 amount, uint256 principal, uint256 fee, uint256 supply);
    modifier nonReentrant() { require(entered == 0, 'REENTRANCY'); entered = 1; _; entered = 0; }
    constructor(address token, address treasury, uint256 unit) {
        require(token.code.length > 0 && treasury != address(0) && treasury != address(this), 'INVALID_ADDRESS');
        require(unit > 0 && unit <= 1e30, 'INVALID_UNIT');
        ctrl = ICTRLToken(token); developmentTreasury = treasury; curveUnit = unit;
    }
    function createWorld(bytes32 id) external nonReentrant {
        require(id != bytes32(0) && worlds[id].owner == address(0), 'WORLD_EXISTS');
        require(ownerWorld[msg.sender] == bytes32(0), 'OWNER_ALREADY_CREATED');
        ownerWorld[msg.sender] = id;
        worlds[id] = World(msg.sender, 1, 0);
        balanceOf[id][msg.sender] = 1;
        emit WorldCreated(id, msg.sender);
    }
    function sumSquares(uint256 n) private pure returns(uint256) { return n*(n+1)*(2*n+1)/6; }
    function curve(uint256 start, uint256 amount) public view returns(uint256) {
        require(start >= 1 && amount > 0 && amount <= 100 && start + amount <= MAX_SUPPLY, 'INVALID_AMOUNT');
        return (sumSquares(start+amount-1)-sumSquares(start-1))*curveUnit;
    }
    function quoteBuy(bytes32 id, uint256 amount) public view returns(uint256 principal,uint256 fee,uint256 total) {
        require(worlds[id].owner != address(0), 'UNKNOWN_WORLD');
        principal=curve(worlds[id].supply,amount); fee=principal*FEE_BPS/10000; total=principal+fee;
    }
    function quoteSell(bytes32 id, uint256 amount) public view returns(uint256 principal,uint256 fee,uint256 payout) {
        uint256 supply=worlds[id].supply;
        require(amount>0 && amount<supply, 'OWNER_KEY_RESERVED');
        principal=curve(supply-amount,amount);fee=principal*FEE_BPS/10000;payout=principal-fee;
    }
    function buy(bytes32 id,uint256 amount,uint256 maxTotal,uint256 deadline) external nonReentrant {
        require(block.timestamp<=deadline,'EXPIRED');
        (uint256 principal,uint256 fee,uint256 total)=quoteBuy(id,amount);
        require(total<=maxTotal,'SLIPPAGE');
        uint256 beforeBalance=ctrl.balanceOf(address(this));
        worlds[id].supply+=amount;worlds[id].reserve+=principal;balanceOf[id][msg.sender]+=amount;
        require(ctrl.transferFrom(msg.sender,address(this),total),'TRANSFER_FAILED');
        require(ctrl.balanceOf(address(this))==beforeBalance+total,'UNSUPPORTED_TOKEN');
        if(fee>0)require(ctrl.transfer(developmentTreasury,fee),'FEE_FAILED');
        emit Trade(id,msg.sender,true,amount,principal,fee,worlds[id].supply);
    }
    function sell(bytes32 id,uint256 amount,uint256 minPayout,uint256 deadline) external nonReentrant {
        require(block.timestamp<=deadline,'EXPIRED');
        uint256 held=balanceOf[id][msg.sender];
        require(amount>0 && held>=amount,'INSUFFICIENT_KEYS');
        require(msg.sender!=worlds[id].owner || held-amount>=1,'OWNER_KEY_RESERVED');
        (uint256 principal,uint256 fee,uint256 payout)=quoteSell(id,amount);
        require(payout>=minPayout,'SLIPPAGE');require(worlds[id].reserve>=principal,'RESERVE');
        balanceOf[id][msg.sender]=held-amount;worlds[id].supply-=amount;worlds[id].reserve-=principal;
        require(ctrl.transfer(msg.sender,payout),'TRANSFER_FAILED');
        if(fee>0)require(ctrl.transfer(developmentTreasury,fee),'FEE_FAILED');
        emit Trade(id,msg.sender,false,amount,principal,fee,worlds[id].supply);
    }
}
