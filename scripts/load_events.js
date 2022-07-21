const Web3 = require("web3");
const { ethers } = require("ethers");
const { saveData } = require("../utils/saveData");
const blocks = require("../data/blocks_2000.json");
require("dotenv").config();
const { updateBlocks } = require("../utils/updateBlocks");
const LendingPool = require("../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json");

async function main() {
  const provider = process.env["ALCHEMY_MAINNET_RPC_URL"];
  const web3 = new Web3(provider);
  const contract = new web3.eth.Contract(
    LendingPool.abi,
    "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"
  );

  // const blockSize = 1999;
  // const block = await web3.eth.getBlockNumber();
  // const fromBlock = parseInt(block) - blockSize;

  const calls = blocks.length;

  for (let i = 0; i <= calls; i++) {
    if (blocks[i].saved == false) {
      let j = i;
      const end = j + 100;

      while (j < end) {
        const events = await contract.getPastEvents("Deposit", {
          // filter: { to: toAddress },
          fromBlock: blocks[j].fromBlock,
          toBlock: blocks[j].toBlock
        });

        await saveData(`events/${i}`, events);
        await updateBlocks("blocks_2000", j);
        j++;
      }
      i = j - 1;
    }
  }
  console.log(`events.json written successfully!`);
}

main();
