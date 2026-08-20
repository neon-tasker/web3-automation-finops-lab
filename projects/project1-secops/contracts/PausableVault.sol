// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PausableVault {
    address public owner;
    address public securityGuardian;
    bool public paused;

    mapping(address => uint256) public balances;
    uint256 public totalVaultValue;

    event Deposited(address indexed user, uint256 amount, uint256 newTotal);
    event Withdrawn(address indexed user, uint256 amount, uint256 newTotal);
    event EmergencyPaused(address indexed triggeredBy, string reason, uint256 timestamp);
    event Unpaused(address indexed triggeredBy, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "ERR_NOT_OWNER");
        _;
    }

    modifier onlyGuardianOrOwner() {
        require(msg.sender == securityGuardian || msg.sender == owner, "ERR_NOT_GUARDIAN");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "ERR_VAULT_PAUSED");
        _;
    }

    constructor(address _securityGuardian) {
        require(_securityGuardian != address(0), "ERR_ZERO_GUARDIAN");
        owner = msg.sender;
        securityGuardian = _securityGuardian;
        paused = false;
    }

    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "ERR_ZERO_DEPOSIT");
        balances[msg.sender] += msg.value;
        totalVaultValue += msg.value;
        emit Deposited(msg.sender, msg.value, totalVaultValue);
    }

    function withdraw(uint256 amount) external whenNotPaused {
        require(balances[msg.sender] >= amount, "ERR_INSUFFICIENT_BALANCE");
        require(address(this).balance >= amount, "ERR_VAULT_INSOLVENT");

        balances[msg.sender] -= amount;
        totalVaultValue -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ERR_TRANSFER_FAILED");

        emit Withdrawn(msg.sender, amount, totalVaultValue);
    }

    function emergencyPause(string calldata reason) external onlyGuardianOrOwner {
        require(!paused, "ERR_ALREADY_PAUSED");
        paused = true;
        emit EmergencyPaused(msg.sender, reason, block.timestamp);
    }

    function unpause() external onlyOwner {
        require(paused, "ERR_NOT_PAUSED");
        paused = false;
        emit Unpaused(msg.sender, block.timestamp);
    }
}
