// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.28; 
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; 
import "hardhat/console.sol"; 

contract BuggyRewardPool { 
    IERC20 public depositToken; 
    mapping(address => uint256) public deposits; 
    mapping(address => uint256) public lastDepositTime; 
    
    // Reward rate: 1% of deposit per day 
    uint256 constant DAILY_REWARD_RATE = 1; 

    event Deposited(address user, uint256 amount); 
    event Withdrawn(address user, uint256 amount, uint256 reward); 
    
    constructor(address _depositToken) { 
        depositToken = IERC20(_depositToken); 
    } 
    
    function deposit(uint256 amount) external { 
        require(amount > 0, "Amount must be > 0"); 
        require(depositToken.transferFrom(msg.sender, address(this), amount), "Transfer failed"); 

        // Update user's deposit 
        deposits[msg.sender] += amount; 
        lastDepositTime[msg.sender] = block.timestamp; 
        emit Deposited(msg.sender, amount); 
    } 

    function calculateReward(address user) public view returns (uint256) { 
        if (deposits[user] == 0) return 0; 

        uint256 timeElapsed = block.timestamp - lastDepositTime[user]; 
        uint256 reward = (deposits[user] * DAILY_REWARD_RATE * timeElapsed) / (1 days * 100); 
        
        return reward;
    } 
        
    function withdraw() external { 
        uint256 depositAmount = deposits[msg.sender]; 
        require(depositAmount > 0, "No deposit found"); 

        uint256 reward = calculateReward(msg.sender); 

        // Reset user's deposit 
        deposits[msg.sender] = 0; 

        // Transfer deposit and reward 
        require(depositToken.transfer(msg.sender, depositAmount), "Deposit transfer failed"); 
        require(depositToken.transfer(msg.sender, reward), "Reward transfer failed"); 
        emit Withdrawn(msg.sender, depositAmount, reward); 
    } 
}
