require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    compilers: [
      { version: "0.5.5" },
      { version: "0.6.6" },
      { version: "0.8.8" },
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/2de477c3b1b74816ae5475da6d289208",
        blockNumber: 19000000, 
      },
    },
  },
  mocha: {
    timeout: 120000,
  },
};
