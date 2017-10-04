/*
Case #1

Here we get 1.2 Ethers, so fill CAP exactly

*/


var EloPlayToken = artifacts.require("EloPlayToken");

contract('EloPlayToken', function(accounts) {

    var cap = web3.toWei('1.2', "ether");
    var owner = web3.eth.accounts[0];
    var target_address = web3.eth.accounts[1];
    var contributor = web3.eth.accounts[2];
    var contributor_2 = web3.eth.accounts[3];
    var not_owner = web3.eth.accounts[4];

    var instance;

    beforeEach(async function() {
        instance = await EloPlayToken.deployed();
    });

    it("Cap must be set correctly to " + cap, async function () {
        received_cap = await instance.CAP.call();
        assert.equal(received_cap.valueOf(), cap, "CAP error");
    });

    it("buyPrice at start must me equal to 12000", async function() {
        buyprice = await instance.buyPrice.call();
        assert.equal(buyprice.valueOf(), 12000, "buyPrice error");
    });

    it("target_address must me equal '" + target_address + "'", async function() {
        received_target_address = await instance.TARGET_ADDRESS.call();
        assert.equal(received_target_address.valueOf(), target_address, "target_address error");
    });

    it("owner must me equal '" + owner + "'", async function() {
        received_owner = await instance.owner.call();
        assert.equal(received_owner.valueOf(), owner, "owner error");
    });

    it("halt functionality", async function() {
        received_halted = await instance.halted.call();
        assert.equal(received_halted.valueOf(), false, "init halted status error");
        data = await instance.halt.sendTransaction({'from': owner});
        received_halted = await instance.halted.call();
        assert.equal(received_halted.valueOf(), true, "change halted status error");
        try {
            returnValue = await instance.sendTransaction({'from': contributor, 'value': web3.toWei('1', 'ether')});
            assert(false, "halted contract did not thrown");
        } catch(error) {
            if(error.toString().indexOf("invalid opcode") == -1) {
                assert(false, error.toString());
            }
        }
        data = await instance.unhalt.sendTransaction({'from': owner});
        received_halted = await instance.halted.call();
        assert.equal(received_halted.valueOf(), false, "return halted status error");
    });

    it("buyPriceAt before and after start/end ts must equal 0'", async function() {
        var start_timestamp = await instance.START_TS.call();
        var end_timestamp = await instance.END_TS.call();
        start_timestamp = parseInt(start_timestamp);
        end_timestamp = parseInt(end_timestamp);
        // check for first & last second of period
        var buypriceat = await instance.buyPriceAt.call(start_timestamp - 1);
        var buypriceatlast = await instance.buyPriceAt.call(end_timestamp + 1);

        assert.equal(buypriceat.valueOf(), 0, "buyPriceAt before start_ts error");
        assert.equal(buypriceatlast.valueOf(), 0, "buyPriceAt after end_ts error");
    });


    it("buyPriceAt 1st hour must equal 12000'", async function() {
        var start_timestamp = await instance.START_TS.call();
        start_timestamp = parseInt(start_timestamp);
        // check for first & last second of period
        var buypriceat = await instance.buyPriceAt.call(start_timestamp);
        var buypriceatlast = await instance.buyPriceAt.call(start_timestamp + 3600 - 1);

        assert.equal(buypriceat.valueOf(), 12000, "buyPriceAt 1st second error");
        assert.equal(buypriceatlast.valueOf(), 12000, "buyPriceAt last second error");
    });

    it("buyPriceAt 1st day must equal 11500'", async function() {
        var start_timestamp = await instance.START_TS.call();
        start_timestamp = parseInt(start_timestamp);
        // check for first & last second of period
        var buypriceat = await instance.buyPriceAt.call(start_timestamp + 3600); // from 2nd hour
        var buypriceatlast = await instance.buyPriceAt.call(start_timestamp + 3600*24 - 1); // to end of 1st day

        assert.equal(buypriceat.valueOf(), 11500, "buyPriceAt 1st second error");
        assert.equal(buypriceatlast.valueOf(), 11500, "buyPriceAt last second error");
    });

    it("buyPriceAt 1st week must equal 11000'", async function() {
        var start_timestamp = await instance.START_TS.call();
        start_timestamp = parseInt(start_timestamp);
        // check for first & last second of period
        var buypriceat = await instance.buyPriceAt.call(start_timestamp + 3600 * 24); // from 2nd day
        var buypriceatlast = await instance.buyPriceAt.call(start_timestamp + 3600 * 24 * 7 - 1); // to end of 1st week

        assert.equal(buypriceat.valueOf(), 11000, "buyPriceAt 1st second error");
        assert.equal(buypriceatlast.valueOf(), 11000, "buyPriceAt last second error");
    });

    it("buyPriceAt 2nd week must equal 10500'", async function() {
        var start_timestamp = await instance.START_TS.call();
        start_timestamp = parseInt(start_timestamp);
        // check for first & last second of period
        var buypriceat = await instance.buyPriceAt.call(start_timestamp + 3600 * 24 * 7); // from 2nd week
        var buypriceatlast = await instance.buyPriceAt.call(start_timestamp + 3600 * 24 * 7 * 2 - 1); // to end of 2nd week

        assert.equal(buypriceat.valueOf(), 10500, "buyPriceAt 1st second error");
        assert.equal(buypriceatlast.valueOf(), 10500, "buyPriceAt last second error");
    });

    it("buyPriceAt after 2nd week must equal 10000'", async function() {
        var start_timestamp = await instance.START_TS.call();
        var end_timestamp = await instance.END_TS.call();
        start_timestamp = parseInt(start_timestamp);
        end_timestamp = parseInt(end_timestamp);
        // check for first & last second of period
        var buypriceat = await instance.buyPriceAt.call(start_timestamp + 3600 * 24 * 7 * 2 + 1); // from 2nd week
        var buypriceatlast = await instance.buyPriceAt.call(end_timestamp); // to end timestamp (last second)

        assert.equal(buypriceat.valueOf(), 10000, "buyPriceAt 1st second error");
        assert.equal(buypriceatlast.valueOf(), 10000, "buyPriceAt last second error");
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

    it("< 0.1 ETH transaction denial from " + contributor_2 + ", value: 0.05ETH", async function() {
        try {
            returnValue = await instance.sendTransaction({'from': contributor_2, 'value': web3.toWei('0.05', 'ether')});
            assert(false, "transaction allowed, which is wrong");
        } catch(error) {
            if(error.toString().indexOf("invalid opcode") == -1) {
                assert(false, error.toString());
            }
        }
    });

    it("0.1 ETH transaction " + contributor_2 + ", value: 0.1ETH, must receive 1200 tokens + 1200*30/70 tokens goes to multisig wallet ", async function() {
        var target_balance_before = web3.fromWei(web3.eth.getBalance(target_address), 'ether');
        data = await instance.sendTransaction({'from': contributor_2, 'value': web3.toWei('0.1', 'ether')});
        var target_balance_after = web3.fromWei(web3.eth.getBalance(target_address), 'ether');
        var tokens_contributor_balance = await instance.balanceOf.call(contributor_2);
        var tokens_target_balance = await instance.balanceOf.call(target_address);
        assert.equal((parseFloat(target_balance_before*10) + 1), parseFloat(target_balance_after*10), "target balance error"); // to fix float inaccuracy, everything is multiplied by 10
        assert.equal(web3.fromWei(tokens_contributor_balance.valueOf(), 'ether'), 1200 , "contributor tokens error");
        if (web3.fromWei(tokens_target_balance.valueOf(), 'ether') - 1200*30/70 > 0.00000001) {
            assert(false, "owner tokens error");
        }

    });

    it("0.1 ETH proxy_payment transaction from " + contributor_2 + " to " + not_owner + ", value: 0.1ETH, must receive 1200 tokens + 1200*30/70 tokens goes to multisig wallet ", async function() {
        var target_balance_before = web3.fromWei(web3.eth.getBalance(target_address), 'ether');
        data = await instance.proxyPayment.sendTransaction(not_owner, {'from': contributor_2, 'value': web3.toWei('0.1', 'ether')});
        var target_balance_after = web3.fromWei(web3.eth.getBalance(target_address), 'ether');
        var tokens_not_owner_balance = await instance.balanceOf.call(not_owner);
        var tokens_target_balance = await instance.balanceOf.call(target_address);
        assert.equal((parseFloat(target_balance_before*10) + 1), parseFloat(target_balance_after*10), "target balance error"); // to fix float inaccuracy, everything is multiplied by 10
        assert.equal(web3.fromWei(tokens_not_owner_balance.valueOf(), 'ether'), 1200, "contributor tokens error");
        if (web3.fromWei(tokens_target_balance.valueOf(), 'ether') - 1200*30/70 - 1200*30/70 > 0.00000001) {
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

    it("transaction to fill the cap " + contributor + ", value: 1ETH, must receive 12000 tokens + 12000*30/70 tokens goes to multisig wallet ", async function() {
        var target_balance_before = web3.fromWei(web3.eth.getBalance(target_address), 'ether');
        data = await instance.sendTransaction({'from': contributor, 'value': web3.toWei('1', 'ether')});
        var target_balance_after = web3.fromWei(web3.eth.getBalance(target_address), 'ether');
        var tokens_contributor_balance = await instance.balanceOf.call(contributor);
        var tokens_target_balance = await instance.balanceOf.call(target_address);
        assert.equal(parseFloat(target_balance_before) + 1, target_balance_after, "target balance error");
        assert.equal(web3.fromWei(tokens_contributor_balance.valueOf(), 'ether'), 12000, "contributor tokens error");
        if (web3.fromWei(tokens_target_balance.valueOf(), 'ether') - 1200*30/70 - 1200*30/70 - 12000*30/70 > 0.00000001) {
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
        assert.equal(total_supply, (12000 + 12000*30/70 + 1200 + 1200*30/70 + 1200 + 1200*30/70), "total supply tokens error"); // all token generated
        total_ethers = await instance.totalEthers.call();
        assert.equal(web3.fromWei(total_ethers.valueOf(), 'ether'), 1.2, "total ethers error");
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
