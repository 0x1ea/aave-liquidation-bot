const fs = require("fs");

/**
 *
 * @param {string} fileName
 * @param {int} step
 * @param {int} initialBlock
 * @param {int} latestBlock
 */
async function createBlockData(fileName, step, initialBlock, latestBlock) {
  let block = initialBlock || 11362579;
  const toBlock = latestBlock || 15185805;
  const data = [];

  while (block <= latestBlock) {
    const info = {
      fromBlock: block,
      toBlock: block + step,
      saved: false
    };
    block = block + step + 1;
    data.push(info);
  }

  fs.writeFile(`./data/${fileName}_${step}.json`, JSON.stringify(data), err => {
    if (err) {
      return console.error(err);
    }
  });

  console.log(`${fileName}_${step}.json written successfully!`);
}

// For Polygon
// createBlockData("blocks", 2000, 12687246, 30989475);

module.exports = { createBlockData };
