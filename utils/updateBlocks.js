const fs = require("fs");

async function updateBlocks(fileName, index) {
  const blocks = require(`../data/${fileName}.json`);

  fs.readFile(`./data/${fileName}.json`, async (err, buf) => {
    let save = buf.toString();
    const newSave = await JSON.parse(save);

    newSave[index].saved = true;

    fs.writeFile(`./data/${fileName}.json`, JSON.stringify(newSave), err => {
      if (err) {
        return console.error(err);
      }
    });
  });
}

module.exports = { updateBlocks };
