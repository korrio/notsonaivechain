const R = require('ramda');

class Transaction {
    construct() {
        this.id = null;
        this.hash = null;        
        this.data = { 
            inputs: [],
            outputs: []
        };
    }

    static fromJson(data) {
        let transaction = new Transaction();
        R.forEachObjIndexed((value, key) => { transaction[key] = value; }, data);        
        return transaction;
    }

}

module.exports = Transaction;