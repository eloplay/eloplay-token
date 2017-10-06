var EloPlayToken = artifacts.require("./EloPlayToken.sol");

module.exports = function(deployer) {

    var current_ts = Math.floor(Date.now() / 1000);
    // test contract for 30 days for buyPriceAt tests
    var contract_ttl = 3600 * 24 * 30;
    var cap = web3.toWei('1.2', "ether"); // ethers to wei
    var target_address = web3.eth.accounts[1];
    var target_tokens_address = web3.eth.accounts[5];

    deployer.deploy(EloPlayToken, current_ts, current_ts + contract_ttl, cap, target_address, target_tokens_address, 300);
    console.log('contract deployed');
};
