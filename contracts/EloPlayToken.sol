pragma solidity ^0.4.11;

/**
 * Eloplay Crowdsale Token Contract
 * @author Eloplay team (2017)
 * The MIT Licence
 */


/**
 * Safe maths, borrowed from OpenZeppelin
 * https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/math/SafeMath.sol
 */
library SafeMath {

    /**
     * Add a number to another number, checking for overflows
     *
     * @param a           first number
     * @param b           second number
     * @return            sum of a + b
     */
    function add(uint a, uint b) internal returns (uint) {
        uint c = a + b;
        // Check for overflows
        assert(c >= a && c >= b);
        return c;
    }

    /**
     * Subtract a number from another number, checking for underflows
     *
     * @param a           first number
     * @param b           second number
     * @return            a - b
     */
    function sub(uint a, uint b) internal returns (uint) {
        // Check for underflow
        assert(b <= a);
        return a - b;
    }
}


/**
 * Owned contract gives ownership checking
 */
contract Owned {

    /**
     * Current contract owner
     */
    address public owner;
    /**
     * New owner / pretender
     */
    address public newOwner;

    /**
     * Event fires when ownership is transferred and accepted
     *
     * @param _from         initial owner
     * @param _to           new owner
     */
    event OwnershipTransferred(address indexed _from, address indexed _to);

    /**
     * Owned contract constructor
     */
    function Owned() {
        owner = msg.sender;
    }

    /**
     * Modifier - used to check actions allowed only for contract owner
     */
    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    /**
     * Request to change ownership (called by current owner)
     *
     * @param _newOwner         address to transfer ownership to
     */
    function transferOwnership(address _newOwner) onlyOwner {
        newOwner = _newOwner;
    }

    /**
     * Accept ownership request, works only if called by new owner
     */
    function acceptOwnership() {
        if (msg.sender == newOwner) {
            OwnershipTransferred(owner, newOwner);
            owner = newOwner;
        }
    }
}


/**
 * ERC20 Token, with the addition of symbol, name and decimals
 * https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20Token {
    /**
     * Use SafeMath to check over/underflows
     */
    using SafeMath for uint;

    /**
     * Total Supply
     */
    uint256 public totalSupply = 0;

    /**
     * Balances for each account
     */
    mapping(address => uint256) balances;

    /**
     * Owner of account approves the transfer of an amount to another account
     */
    mapping(address => mapping (address => uint256)) allowed;

    /**
     * Get the account balance of another account with address _owner
     *
     * @param _owner      tokens address
     * @return            current balance belonging to address
     */
    function balanceOf(address _owner) constant returns (uint256 balance) {
        return balances[_owner];
    }

    /**
     * Transfer the balance from owner's account to another account
     *
     * @param _to         targed address
     * @param _amount     amount of tokens
     * @return            true on success
     */
    function transfer(address _to, uint256 _amount) returns (bool success) {
        if (balances[msg.sender] >= _amount                // User has balance
            && _amount > 0                                 // Non-zero transfer
            && balances[_to] + _amount > balances[_to]     // Overflow check
        ) {
            balances[msg.sender] = balances[msg.sender].sub(_amount);
            balances[_to] = balances[_to].add(_amount);
            Transfer(msg.sender, _to, _amount);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Allow _spender to withdraw from your account, multiple times, up to the
     * _value amount. If this function is called again it overwrites the
     * current allowance with _value.
     *
     * @param _spender    spender address
     * @param _amount     amount of tokens
     * @return            true on success
     */
    function approve(address _spender, uint256 _amount) returns (bool success) {
        allowed[msg.sender][_spender] = _amount;
        Approval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * Spender of tokens transfer an amount of tokens from the token owner's
     * balance to the spender's account. The owner of the tokens must already
     * have approve(...)-d this transfer
     *
     * @param _from       spender address
     * @param _to         target address
     * @param _amount     amount of tokens
     * @return            true on success
     */
    function transferFrom(address _from, address _to, uint256 _amount) returns (bool success) {
        if (balances[_from] >= _amount                  // From a/c has balance
            && allowed[_from][msg.sender] >= _amount    // Transfer approved
            && _amount > 0                              // Non-zero transfer
            && balances[_to] + _amount > balances[_to]  // Overflow check
        ) {
            balances[_from] = balances[_from].sub(_amount);
            allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_amount);
            balances[_to] = balances[_to].add(_amount);
            Transfer(_from, _to, _amount);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Returns the amount of tokens approved by the owner that can be
     * transferred to the spender's account
     *
     * @param _owner      owner address
     * @param _spender    spender address
     * @return            amount of tokens allowed to transfer
     */
    function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

    /**
     * Event fires when tokens are transferred
     *
     * @param _from         spender address
     * @param _to           target address
     * @param _value        amount of tokens
     */
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    /**
     * Event fires when spending of tokens are approved
     *
     * @param _owner        owner address
     * @param _spender      spender address
     * @param _value        amount of allowed tokens
     */
    event Approval(address indexed _owner, address indexed _spender,
        uint256 _value);
}


contract EloPlayToken is ERC20Token, Owned {

    /**
     * Token data
     */
    string public constant symbol = "ELT";
    string public constant name = "EloPlayToken";
    uint8 public constant decimals = 18;

    /**
     * Wallet where invested Ethers will be sent
     */
    address public target_address;

    /**
     * Start/end timestamp (unix)
     */
    uint256 public START_TS;
    uint256 public END_TS;

    /**
     * CAP in ether - may be changed before crowdsale starts to match actual ETH/USD rate
     */
    uint256 public CAP;

    /**
     * Is contract halted (in case of emergency)
     */
    bool public halted = false;

    /**
     * Total Ethers invested
     */
    uint256 public totalEthers;

    /**
     * EloPlayToken contract constructor
     *
     * @param _start_ts         crowdsale start timestamp (unix)
     * @param _end_ts           crowdsale end timestamp (unix)
     * @param _cap              crowdsale upper cap (in wei)
     * @param _target_address   multisignature wallet where Ethers will be sent to
     */
    function EloPlayToken(uint256 _start_ts, uint256 _end_ts, uint256 _cap, address _target_address) {
        START_TS        = _start_ts;
        END_TS          = _end_ts;
        CAP             = _cap;
        target_address  = _target_address;
    }

    /**
     * Update cap before crowdsale starts
     *
     * @param _cap          new crowdsale upper cap (in wei)
     */
    function updateCap(uint256 _cap) onlyOwner {
        // Don't process if halted
        require(!halted);
        // Make sure crowdsale isnt started yet
        require(now < START_TS);
        CAP = _cap;
    }

    /**
     * Get tokens per ETH for current date/time
     *
     * @return            current tokens/ETH rate
     */
    function buyPrice() constant returns (uint256) {
        return buyPriceAt(now);
    }

    /**
     * Get tokens per ETH for given date/time
     *
     * @param _at         timestamp (unix)
     * @return            tokens/ETH rate for given timestamp
     */
    function buyPriceAt(uint256 _at) constant returns (uint256) {
        if (_at < START_TS) {
            return 0;
        } else if (_at < START_TS + 3600) {
            // 1st hour = 10000 + 20% = 12000
            return 12000;
        } else if (_at < START_TS + 3600 * 24) {
            // 1st day = 10000 + 15% = 11500
            return 11500;
        } else if (_at < START_TS + 3600 * 24 * 7) {
            // 1st week = 10000 + 10% = 11000
            return 11000;
        } else if (_at < START_TS + 3600 * 24 * 7 * 2) {
            // 2nd week = 10000 + 5% = 10500
            return 10500;
        } else if (_at <= END_TS) {
            // More than 2 weeks = 10000
            return 10000;
        } else {
            return 0;
        }
    }

    /**
     * Halt transactions in case of emergency
     */
    function halt() onlyOwner {
        require(!halted);
        halted = true;
    }

    /**
     * Unhalt halted contract
     */
    function unhalt() onlyOwner {
        require(halted);
        halted = false;
    }

    /**
     * Buy tokens from the contract
     */
    function () payable {
        proxyPayment(msg.sender);
    }


    /**
     * Exchanges can buy on behalf of participant
     *
     * @param _participant         address that will receive tokens
     */
    function proxyPayment(address _participant) payable {
        // Don't process if halted
        require(!halted);
        // No contributions before the start of the crowdsale
        require(now >= START_TS);
        // No contributions after the end of the crowdsale
        require(now <= END_TS);
        // Require 0.1 eth minimum
        require(msg.value >= 0.1 ether);

        // Add ETH raised to total
        totalEthers = totalEthers.add(msg.value);
        // Cannot exceed cap
        require(totalEthers <= CAP);

        // What is the ELT to ETH rate
        uint256 _buyPrice = buyPrice();

        // Calculate #ELT - this is safe as _buyPrice is known
        // and msg.value is restricted to valid values
        uint tokens = msg.value * _buyPrice;

        // Check tokens > 0
        require(tokens > 0);
        // Compute tokens for foundation; user tokens = 80%; target_address = 20%
        // Number of tokens restricted so maths is safe
        uint target_address_tokens = tokens * 20 / 80;

        // Add to total supply
        totalSupply = totalSupply.add(tokens);
        totalSupply = totalSupply.add(target_address_tokens);

        // Add to balances
        balances[_participant] = balances[_participant].add(tokens);
        balances[target_address] = balances[target_address].add(target_address_tokens);

        // Log events
        TokensBought(_participant, msg.value, totalEthers, tokens, target_address_tokens,
            totalSupply, _buyPrice);
        Transfer(0x0, _participant, tokens);
        Transfer(0x0, target_address, target_address_tokens);

        // Move the funds to a safe wallet
        target_address.transfer(msg.value);
    }

    /**
     * Event fires when tokens are bought
     *
     * @param buyer                     tokens buyer
     * @param ethers                    total Ethers invested (in wei)
     * @param new_ether_balance         new Ethers balance (in wei)
     * @param tokens                    tokens bought for transaction
     * @param target_address_tokens     additional tokens generated for multisignature wallet
     * @param new_total_supply          total tokens bought
     * @param buy_price                 tokens/ETH rate for transaction
     */
    event TokensBought(address indexed buyer, uint256 ethers,
        uint256 new_ether_balance, uint256 tokens, uint256 target_address_tokens,
        uint256 new_total_supply, uint256 buy_price);

    /**
     * Transfer the balance from owner's account to another account, with a
     * check that the crowdsale is finalised and contract isn't halted
     *
     * @param _to                tokens receiver
     * @param _amount            tokens amount
     * @return                   true on success
     */
    function transfer(address _to, uint _amount) returns (bool success) {
        // Cannot transfer before crowdsale ends or cap reached
        require(now > END_TS || totalEthers == CAP);
        // Standard transfer
        return super.transfer(_to, _amount);
    }


    /**
     * Spender of tokens transfer an amount of tokens from the token owner's
     * balance to another account, with a check that the crowdsale is
     * finalised and contract isn't halted
     *
     * @param _from              tokens sender
     * @param _to                tokens receiver
     * @param _amount            tokens amount
     * @return                   true on success
     */
    function transferFrom(address _from, address _to, uint _amount)
            returns (bool success) {
        // Cannot transfer before crowdsale ends or cap reached
        require(now > END_TS || totalEthers == CAP);
        // Standard transferFrom
        return super.transferFrom(_from, _to, _amount);
    }


    /**
     * Owner can transfer out any accidentally sent ERC20 tokens
     *
     * @param tokenAddress       tokens receiver
     * @param amount             tokens amount
     * @return                   true on success
     */
    function transferAnyERC20Token(address tokenAddress, uint amount)
      onlyOwner returns (bool success) {
        return ERC20Token(tokenAddress).transfer(owner, amount);
    }
}