const fs = require("fs");

/**
 *
 * @param {string} fileName -
 * @param {array} dataSet -
 */
async function saveData(fileName, dataSet) {
  fs.readFile(`./data/${fileName}.json`, async (err, buf) => {
    if (!buf) {
      fs.writeFile(`./data/${fileName}.json`, "[]", err => {
        if (err) {
          return console.error(err);
        }
      });
    } else {
      fs.readFile(`./data/${fileName}.json`, async (err, buf) => {
        let save = await buf.toString();
        const newSave = await JSON.parse(save);

        dataSet.map(data => {
          /*       const info = {
            asset: event.returnValues["reserve"],
            from: event.returnValues["user"],
            onBehalfOf: event.returnValues["onBehalfOf"],
            amountWei: event.returnValues["amount"],
            amount: ethers.utils.formatEther(event.returnValues["amount"]),
            refferalCode: event.returnValues["referral"]
          }; */
          newSave.push(data);
        });

        fs.writeFile(`./data/${fileName}.json`, JSON.stringify(newSave), err => {
          if (err) {
            return console.error(err);
          }
        });
      });
    }
  });
}

module.exports = { saveData };
