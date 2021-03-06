const Wallets = require('./wallets');
const Wallet = require('./wallet');
const Db = require('../util/db');
const R = require('ramda');
const TransactionBuilder = require('./transactionBuilder');
const HTTPError = require('node-http-error');

const OPERATOR_FILE = 'wallets.json';

class Operator {
    constructor(dbName, blockchain) {
        this.db = new Db('data/' + dbName + '/' + OPERATOR_FILE, new Wallets());
        this.wallets = this.db.read(Wallets);
        this.blockchain = blockchain;
    }

    addWallet(wallet) {
        this.wallets.push(wallet);
        this.db.write(this.wallets);
        return wallet;
    }

    createWalletFromPassword(password) {
        let newWallet = Wallet.fromPassword(password);
        return this.addWallet(newWallet);
    }

    createWalletFromHash(hash) {
        let newWallet = Wallet.fromHash(hash);
        return this.addWallet(newWallet);
    }

    getWalletById(walletId) {
        return R.find((wallet) => { return wallet.id == walletId; }, this.wallets);
    }

    generateAddressForWallet(walletId) {
        let wallet = this.getWalletById(walletId);
        if (wallet == null) throw new HTTPError(400, `Wallet not found with id '${walletId}'`);

        let address = wallet.generateAddress();
        this.db.write(this.wallets);
        return address;
    }

    getAddressesForWallet(walletId) {
        let wallet = this.getWalletById(walletId);
        if (wallet == null) throw new HTTPError(400, `Wallet not found with id '${walletId}'`);

        let addresses = wallet.getAddresses();
        return addresses;
    }

    getAddressForWallet(walletId, addressId) {        
        let wallet = this.getWalletById(walletId);
        if (wallet == null) throw new HTTPError(400, `Wallet not found with id '${walletId}'`);

        let addressFound = wallet.getAddressByPublicKey(addressId);
        if (addressFound == null) throw new HTTPError(400, `Address not found with id '${addressId}' for wallet ${walletId}`);

        return addressFound;
    }

    getBalanceForWalletAddress(walletId, addressId) {
        let address = this.getAddressForWallet(walletId, addressId);
        let utxo = this.blockchain.getUnspentTransactionsForAddress(address);
        return R.sum(R.map(R.prop('amount'), utxo));
    }

    createTransaction(walletId, fromAddressId, toAddressId, amount, changeAddressId) {
        let utxo = this.blockchain.getUnspentTransactionsForAddress(fromAddressId);
        let wallet = this.getWalletById(walletId);

        if (wallet == null) throw new HTTPError(400, `Wallet not found with id '${walletId}'`);

        let secretKey = wallet.getSecretKeyByAddress(fromAddressId);

        if (secretKey == null) throw new HTTPError(400, `Secret key not found with Wallet id '${walletId}' and address '${fromAddressId}'`);

        let tx = new TransactionBuilder();
        tx.from(utxo);
        tx.to(toAddressId, amount);
        tx.change(changeAddressId || fromAddressId);
        tx.fee(1);
        tx.sign(secretKey);

        return tx.build();
    }
}

module.exports = Operator;