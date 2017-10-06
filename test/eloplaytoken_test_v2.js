/*
Case #2, some test removed as they are same as in V1

Here we get 1.15 Ethers, so to fill CAP, we need exceed it by 0.1 (total will be 1.25)

*/

var EloPlayToken = artifacts.require("EloPlayToken");

contract('EloPlayToken', function(accounts) {

    var cap = web3.toWei('1.2', "ether");
    var owner = web3.eth.accounts[0];
    var target_address = web3.eth.accounts[1];
    var target_tokens_address = web3.eth.accounts[5];
    var contributor = web3.eth.accounts[2];
    var contributor_2 = web3.eth.accounts[3];
    var not_owner = web3.eth.accounts[4];

    var instance;

    beforeEach(async function() {
        instance = await EloPlayToken.deployed();
    });

    it("too big transaction denial from " + contributor_2 + ", value: 10ETH", async function() {
        try {
            returnValue = await instance.sendTransaction({'from': contributor_2, 'value': web3.toWei('10', 'ether')});
            assert(false, "over-cap did not denied");
        } catch(error) {
            if(error.toString().indexOf("invalid opcode") == -1) {
                assert(false, error.toString());
            }
        }
    });

    it("1.15 ETH transaction " + contributor + ", value: 1.15 ETH, must receive 13800 tokens + 13800*30/70 tokens goes to multisig wallet ", async function() {
        var target_balance_before = web3.fromWei(web3.eth.getBalance(target_address), 'ether');
        data = await instance.sendTransaction({'from': contributor, 'value': web3.toWei('1.15', 'ether')});
        var target_balance_after = web3.fromWei(web3.eth.getBalance(target_address), 'ether');
        var tokens_contributor_balance = await instance.balanceOf.call(contributor);
        var tokens_target_balance = await instance.balanceOf.call(target_tokens_address);
        assert.equal((parseFloat(target_balance_before*100) + 115), parseFloat(target_balance_after*100), "target balance error"); // to fix float inaccuracy, everything is multiplied by 10
        assert.equal(web3.fromWei(tokens_contributor_balance.valueOf(), 'ether'), 13800 , "contributor tokens error");
        if (Math.abs(web3.fromWei(tokens_target_balance.valueOf(), 'ether') - 13800*30/70) > 0.00000001) {
            assert(false, "owner tokens error");
        }
    });

    it("token transfer denial before cap filled from " + contributor_2 + " to " + contributor + ", tokens: 10", async function() {
        try {
            returnValue = await instance.transfer.sendTransaction(contributor_2, web3.toWei('10', 'ether'), {'from': contributor});
            assert(false, "transfer allowed, which is wrong");
        } catch(error) {
            if(error.toString().indexOf("invalid opcode") == -1) {
                assert(false, error.toString());
            }
        }
    });

    it("0.1 ETH transaction to fill the cap " + contributor_2 + ", value: 0.1ETH, must receive 1200 tokens + 1200*30/70 tokens goes to multisig wallet ", async function() {
        var target_balance_before = web3.fromWei(web3.eth.getBalance(target_address), 'ether');
        data = await instance.sendTransaction({'from': contributor_2, 'value': web3.toWei('0.1', 'ether')});
        var target_balance_after = web3.fromWei(web3.eth.getBalance(target_address), 'ether');
        var tokens_contributor_balance = await instance.balanceOf.call(contributor_2);
        var tokens_target_balance = await instance.balanceOf.call(target_tokens_address);
        assert.equal((parseFloat(target_balance_before*10) + 1), parseFloat(target_balance_after*10), "target balance error"); // to fix float inaccuracy, everything is multiplied by 10
        assert.equal(web3.fromWei(tokens_contributor_balance.valueOf(), 'ether'), 1200 , "contributor tokens error");
        if (Math.abs(web3.fromWei(tokens_target_balance.valueOf(), 'ether') - 13800*30/70 - 1200*30/70) > 0.00000001) {
            assert(false, "owner tokens error");
        }
    });

    it("transaction denial after cap filled from " + contributor_2 + ", value: 0.1ETH", async function() {
        try {
            returnValue = await instance.sendTransaction({'from': contributor_2, 'value': web3.toWei('0.1', 'ether')});
            assert(false, "transaction allowed, which is wrong");
        } catch(error) {
            if(error.toString().indexOf("invalid opcode") == -1) {
                assert(false, error.toString());
            }
        }
    });

    it("check crowdsale results after cap filled", async function() {
        var total_supply = await instance.totalSupply.call();
        total_supply = web3.fromWei(total_supply.valueOf(), 'ether');
        assert.equal(total_supply, (13800 + 13800*30/70 + 1200 + 1200*30/70), "total supply tokens error"); // all token generated
        total_ethers = await instance.totalEthers.call();
        assert.equal(web3.fromWei(total_ethers.valueOf(), 'ether'), 1.25, "total ethers error");
    });

    it("token transfer after cap filled from " + contributor_2 + " to " + contributor + ", tokens: 10", async function() {
        var tokens_contributor_balance_before = await instance.balanceOf.call(contributor);
        tokens_contributor_balance_before = web3.fromWei(tokens_contributor_balance_before.valueOf(), 'ether');
        var tokens_contributor_2_balance_before = await instance.balanceOf.call(contributor_2);
        tokens_contributor_2_balance_before = web3.fromWei(tokens_contributor_2_balance_before.valueOf(), 'ether');

        returnValue = await instance.transfer.sendTransaction(contributor_2, web3.toWei('10', 'ether'), {'from': contributor});

        var tokens_contributor_balance_after = await instance.balanceOf.call(contributor);
        tokens_contributor_balance_after = web3.fromWei(tokens_contributor_balance_after.valueOf(), 'ether');
        var tokens_contributor_2_balance_after = await instance.balanceOf.call(contributor_2);
        tokens_contributor_2_balance_after = web3.fromWei(tokens_contributor_2_balance_after.valueOf(), 'ether');

        assert.equal(tokens_contributor_balance_after, parseInt(tokens_contributor_balance_before) - 10, "sender tokens error");
        assert.equal(tokens_contributor_2_balance_after, parseInt(tokens_contributor_2_balance_before) + 10, "receiver tokens error");
    });

    it("token transferFrom denial (no allowance given) after cap filled from " + contributor + " to " + not_owner + ", tokens: 10", async function() {
        var tokens_contributor_balance_before = await instance.balanceOf.call(contributor);
        var tokens_not_owner_balance_before = await instance.balanceOf.call(not_owner);

        returnValue = await instance.transferFrom.sendTransaction(contributor, not_owner, web3.toWei('10', 'ether'), {'from': not_owner});

        var tokens_contributor_balance_after = await instance.balanceOf.call(contributor);
        var tokens_not_owner_balance_after = await instance.balanceOf.call(not_owner);

        assert.equal(tokens_contributor_balance_after.valueOf(), tokens_contributor_balance_before.valueOf(), "sender tokens error - changed");
        assert.equal(tokens_not_owner_balance_after.valueOf(), tokens_not_owner_balance_before.valueOf(), "receiver tokens error - changed");

    });

    it("token approval & transferFrom routine (allowance given) after cap filled from " + contributor + " to " + not_owner + ", tokens: 10", async function() {
        var tokens_contributor_balance_before = await instance.balanceOf.call(contributor);
        tokens_contributor_balance_before = web3.fromWei(tokens_contributor_balance_before.valueOf(), 'ether');
        var tokens_not_owner_balance_before = await instance.balanceOf.call(not_owner);
        tokens_not_owner_balance_before = web3.fromWei(tokens_not_owner_balance_before.valueOf(), 'ether');

        returnValue = await instance.approve.sendTransaction(not_owner, web3.toWei('10', 'ether'), {'from': contributor});

        returnValue = await instance.transferFrom.sendTransaction(contributor, not_owner, web3.toWei('10', 'ether'), {'from': not_owner});

        var tokens_contributor_balance_after = await instance.balanceOf.call(contributor);
        tokens_contributor_balance_after = web3.fromWei(tokens_contributor_balance_after.valueOf(), 'ether');
        var tokens_not_owner_balance_after = await instance.balanceOf.call(not_owner);
        tokens_not_owner_balance_after = web3.fromWei(tokens_not_owner_balance_after.valueOf(), 'ether');


        assert.equal(tokens_contributor_balance_after, parseInt(tokens_contributor_balance_before) - 10, "spender tokens error");
        assert.equal(tokens_not_owner_balance_after, parseInt(tokens_not_owner_balance_before) + 10, "receiver tokens error");

    });

});
