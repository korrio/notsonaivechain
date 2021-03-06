# Notsonaivechain - a blockchain implementation in more than 200 lines of code

### Motivation
All the current implementations of blockchains are tightly coupled with the larger context and problems they (e.g. Bitcoin or Ethereum) are trying to solve. This makes understanding blockchains a necessarily harder task, than it must be. Especially source-code-wisely. This project is an attempt to provide as concise and simple implementation of a blockchain as possible.

 
### What is blockchain
[From Wikipedia](https://en.wikipedia.org/wiki/Blockchain_(database)) : Blockchain is a distributed database that maintains a continuously-growing list of records called blocks secured from tampering and revision.

### Key concepts of NotSoNaivechain
Check also [this blog post](https://medium.com/@lhartikk/a-blockchain-in-200-lines-of-code-963cc1cc0e54#.dttbm9afr5) for a more detailed overview of the key concepts
* HTTP interface to control the node and to communicate with other nodes (P2P)
* No proof-of-work or proof-of-stake: a block can be added to the blockchain without competition

![alt tag](img/naivechain_blockchain.png)

![alt tag](img/naivechain_components.png)

### Quick start
(set up two connected nodes and mine 1 block)
```
npm install
HTTP_PORT=3001 npm start
HTTP_PORT=3002 PEERS=http://localhost:3001 npm start
curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/blockchain/blocks/mine
```

### Quick start with Docker
(set up three connected nodes and mine a block)
###
```sh
docker-compose up
curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/blockchain/blocks/mine
```

### HTTP API
##### Get blockchain
```
curl http://localhost:3001/blocks
```
##### Create block
```
curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/blockchain/blocks/mine
``` 
##### Add peer
```
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3001/node/peers/new
```
#### Query connected peers
```
curl http://localhost:3001/node/peers
```
