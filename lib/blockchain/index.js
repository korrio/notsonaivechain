const Blocks = require('./blocks');
const Block = require('./block');
const Transaction = require('./transaction');
const Transactions = require('./transactions');
const CryptoUtil = require('../util/cryptoUtil');
const CryptoEdDSAUtil = require('../util/cryptoEdDSAUtil');
const Db = require('../util/db');
const R = require('ramda');

const BLOCKCHAIN_FILE = 'blocks.json';
const TRANSACTIONS_FILE = 'transactions.json';

class Blockchain {
    constructor(dbName) {
        this.blocksDb = new Db('data/' + dbName + '/' + BLOCKCHAIN_FILE, new Blocks());
        this.transactionsDb = new Db('data/' + dbName + '/' + TRANSACTIONS_FILE, new Transactions());
        this.blocks = this.blocksDb.read(Blocks);
        this.transactions = this.transactionsDb.read(Transactions);
        this.init();
    }

    init() {
        if (this.blocks.length == 0) {
            this.blocks.push(Block.genesis);
            this.blocksDb.write(this.blocks);
        }

        // Remove transactions that are in the chainblock
        R.forEach((block) => {
            this.removeBlockTransactionsFromTransactions(block);
        }, this.blocks);
    }

    getAllBlocks() {
        return this.blocks;
    }

    getAllTransactions() {
        return this.transactions;
    }

    getBlockByIndex(index) {
        return this.blocks.find((block) => { return block.index == index; });
    }

    getTransactionById(id) {
        return this.transactions.find((transaction) => { return transaction.id == id; });
    }

    getBlockByHash(hash) {
        return this.blocks.find((block) => { return block.hash == hash; });
    }

    getLastBlock() {
        return R.last(this.blocks);
    }

    replaceChain(newBlockchain) {
        if (!this.isValidChain(newBlockchain) || newBlockchain.length <= this.blocks.length) {
            console.log('Received blockchain invalid');
            return;
        }

        // Get the blocks that diverges from our blockchain
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        let newBlocks = R.takeLast(newBlockchain.length - this.blocks.length, newBlockchain);

        R.forEach((block) => {
            this.addBlock(block);
        }, newBlocks);
    }

    isValidChain(blockchainToValidate) {
        if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(Block.genesis)) {
            return false;
        }

        for (let i = 1; i < blockchainToValidate.length; i++) {
            if (!this.isValidBlock(Block.fromJson(blockchainToValidate[i]), blockchainToValidate[i - 1])) {
                return false;
            }
        }
        return true;
    }

    addBlock(newBlock) {
        if (this.isValidBlock(newBlock, this.getLastBlock())) {
            this.blocks.push(newBlock);
            this.removeBlockTransactionsFromTransactions(newBlock);
            this.blocksDb.write(this.blocks);
        }
        return newBlock;
    }

    addTransaction(newTransaction) {
        if (this.isValidTransaction(newTransaction)) {
            this.transactions.push(newTransaction);
            this.transactionsDb.write(this.transactions);
        }
        return newTransaction;
    }

    removeBlockTransactionsFromTransactions(newBlock) {
        // TODO: Improve this R
        R.forEach((blockTransaction) => {
            this.transactions = R.reject((transaction) => { return transaction.id == blockTransaction.id; }, this.transactions);
        }, newBlock.transactions);
        this.transactionsDb.write(this.transactions);
    }

    isValidBlock(newBlock, previousBlock) {
        const blockHash = newBlock.toHash();

        if (previousBlock.index + 1 !== newBlock.index) {
            console.debug('Invalid index');
            return false;
        } else if (previousBlock.hash !== newBlock.previousHash) {
            console.debug('Invalid previoushash');
            return false;
        } else if (blockHash !== newBlock.hash) {
            console.debug(typeof (newBlock.hash) + ' ' + typeof blockHash);
            console.debug(`Invalid hash: ${blockHash} ${newBlock.hash}`);
            return false;
        }
        return true;
    }

    isValidTransaction(transaction) {
        let isValid = true;

        let transactionHash = CryptoUtil.hash(transaction.id + JSON.stringify(transaction.data)) == transaction.hash;
        let txInputSignature = R.all(R.equals(true), R.map((txInput) => {
            let txInputHash = CryptoUtil.hashObject({
                transaction: txInput.transaction,
                index: txInput.index,
                address: txInput.address
            });
            return CryptoEdDSAUtil.verifySignature(txInput.address, txInput.signature, txInputHash);
        }, transaction.data.inputs));

        isValid = R.all(R.equals(true), [
            transactionHash,
            txInputSignature,
            // TODO: Check if the UTXO are really unspent
            // TODO: Check if the amount of transaction inputs are larger than transaction outputs
            // TODO: Check if is there a fee amount left
        ]);

        return isValid;
    }

    getUnspentTransactionsForAddress(address) {
        let txOutputs = [];

        // TODO: Convert this to R
        for (var blockIndex = 0; blockIndex < this.blocks.length; blockIndex++) {
            let block = this.blocks[blockIndex];

            for (var txIndex = 0; txIndex < block.transactions.length; txIndex++) {
                let tx = block.transactions[txIndex];

                for (var txOIndex = 0; txOIndex < tx.data.outputs.length; txOIndex++) {
                    let txOutput = tx.data.outputs[txOIndex];

                    if (txOutput.address == address) {
                        txOutputs.push({
                            transaction: tx.id,
                            index: txOIndex,
                            amount: txOutput.amount,
                            address: txOutput.address
                        });
                    }
                }
            }
        }

        let txInputs = [];
        for (blockIndex = 0; blockIndex < this.blocks.length; blockIndex++) {
            let block = this.blocks[blockIndex];

            for (txIndex = 0; txIndex < block.transactions.length; txIndex++) {
                let tx = block.transactions[txIndex];

                for (var txIIndex = 0; txIIndex < tx.data.inputs.length; txIIndex++) {
                    let txInput = tx.data.inputs[txIIndex];

                    if (txInput.address == address) {
                        txInputs.push({
                            transaction: txInput.transaction,
                            index: txInput.index,
                            amount: txInput.amount,
                            address: txInput.address
                        });
                    }
                }
            }
        }

        let unspentTransactionOutput = [];
        txOutputs.forEach((txOutput) => {
            if (!(txInputs.find((txInput) => { return txInput.transaction == txOutput.transaction && txInput.index == txOutput.index; }))) {
                unspentTransactionOutput.push(txOutput);
            }
        });

        return unspentTransactionOutput;
    }
}

module.exports = Blockchain;
