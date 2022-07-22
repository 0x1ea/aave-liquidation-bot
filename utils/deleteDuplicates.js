const fs = require("fs");

async function deleteDuplicates() {
  const FILE_NAME_TO_CLEAN = "allUsers_polygon";
  const OUTPUT_FILE_NAME = "uniqueUsers_polygon";

  const allUsers = require(`../data/${FILE_NAME_TO_CLEAN}.json`);
  let uniqueUsers = [...new Set(allUsers)];
  console.log(`File: ${FILE_NAME_TO_CLEAN}, all users length: ${allUsers.length}`);
  console.log(`File: ${OUTPUT_FILE_NAME}, unique users length: ${uniqueUsers.length}`);

  fs.readFile(`./data/${OUTPUT_FILE_NAME}.json`, async (err, buf) => {
    if (!buf) {
      fs.writeFile(`./data/${OUTPUT_FILE_NAME}.json`, "[]", err => {
        if (err) {
          return console.error(err);
        }
      });
      deleteDuplicates();
    } else {
      fs.readFile(`./data/${OUTPUT_FILE_NAME}.json`, async (err, buf) => {
        fs.writeFile(`./data/${OUTPUT_FILE_NAME}.json`, JSON.stringify(uniqueUsers), err => {
          if (err) {
            return console.error(err);
          }
        });
      });
    }
  });
}

deleteDuplicates();

module.exports = { deleteDuplicates };
