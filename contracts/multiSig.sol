// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MultiSig {
    uint256 public quorum;
    uint8 public noOfValidSigners;
    uint256 public txCount;
    uint256 public _txId;

    struct Transaction {
        uint256 id;
        uint256 amount;
        address sender;
        address recipient;
        bool isCompleted;
        uint256 timestamp;
        uint256 noOfApproval;
        address tokenAddress;
        address[] transactionSigners;
    }


    // events
    event Transfer(uint256 indexed txId, address indexed sender, address indexed recipient, uint256 amount, address tokenAddress);
    event updateQuorum(uint256 indexed _quorum);
    event Approved(uint256 txId, address signer);


    // errors
    error InvalidSigner();
    error InvalidQuorum();
    error InvalidAmount();
    error InvalidRecipient();
    error InvalidTokenAddress();


    mapping(address => bool) isValidSigner;
    mapping(uint => Transaction) transactions; // txId -> Transaction
    // signer -> transactionId -> bool (checking if an address has signed)
    mapping(address => mapping(uint256 => bool)) hasSigned;

    constructor(uint256 _quorum, address[] memory _validSigners) {

        require(_validSigners.length > 1, "few valid signers");
        require(_quorum > 1, "quorum is too small");


        for(uint256 i = 0; i < _validSigners.length; i++) {
            require(_validSigners[i] != address(0), "zero address not allowed");
            require(!isValidSigner[_validSigners[i]], "signer already exist");

            isValidSigner[_validSigners[i]] = true;
        }

        noOfValidSigners = uint8(_validSigners.length);

        if (!isValidSigner[msg.sender]){
            isValidSigner[msg.sender] = true;
            noOfValidSigners += 1;
        }

        require(_quorum <= noOfValidSigners, "quorum greater than valid signers");
        quorum = _quorum;
    }

    function transfer(uint256 _amount, address _recipient, address _tokenAddress) external  {
        require(msg.sender != address(0), "address zero found");
        require(isValidSigner[msg.sender], "invalid signer");

        require(_amount > 0, "can't send zero amount");
        require(_recipient != address(0), "address zero found");
        require(_tokenAddress != address(0), "address zero found");

        require(IERC20(_tokenAddress).balanceOf(address(this)) >= _amount, "insufficient funds");

        _txId += 1;

        Transaction storage trx = transactions[_txId];
        
        trx.id = _txId;
        trx.amount = _amount;
        trx.recipient = _recipient;
        trx.sender = msg.sender;
        trx.timestamp = block.timestamp;
        trx.tokenAddress = _tokenAddress;
        trx.noOfApproval += 1;
        trx.transactionSigners.push(msg.sender);
        hasSigned[msg.sender][_txId] = true;

        txCount += 1;

        emit Transfer(_txId, msg.sender, _recipient, _amount, _tokenAddress);

    }

    function approveTx(uint256 txId) external returns (uint256) {
        Transaction storage trx = transactions[txId];

        require(trx.id != 0, "invalid tx id");
        
        require(IERC20(trx.tokenAddress).balanceOf(address(this)) >= trx.amount, "insufficient funds");
        require(!trx.isCompleted, "transaction already completed");
        require(trx.noOfApproval < quorum, "approvals already reached");

       

        require(isValidSigner[msg.sender], "not a valid signer");
        require(!hasSigned[msg.sender][txId], "can't sign twice");

        hasSigned[msg.sender][txId] = true;
        trx.noOfApproval += 1;
        trx.transactionSigners.push(msg.sender);

        if(trx.noOfApproval == quorum) {
            trx.isCompleted = true;
            IERC20(trx.tokenAddress).transfer(trx.recipient, trx.amount);
        }

        emit Approved(txId, msg.sender);

        return txId;
    }

   
    function updatedQuorum(uint8 _quorum) external {
        require(isValidSigner[msg.sender], "not a valid signer");
        require(_quorum > 1, "quorum is too small");
        require(_quorum <= noOfValidSigners, "quorum greater than valid signers");

        quorum = _quorum;

        emit updateQuorum(_quorum);
    }
}