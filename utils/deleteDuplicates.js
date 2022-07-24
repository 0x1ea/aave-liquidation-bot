const fs = require("fs");

async function deleteDuplicates(folderName, inputFile, outputFile) {
  const FILE_NAME_TO_CLEAN = inputFile;
  const OUTPUT_FILE_NAME = outputFile;

  const allUsers = require(`../${folderName}/${FILE_NAME_TO_CLEAN}.json`);
  let uniqueUsers = [...new Set(allUsers)];
  console.log(`File: ${FILE_NAME_TO_CLEAN}, all users length: ${allUsers.length}`);
  console.log(`File: ${OUTPUT_FILE_NAME}, unique users length: ${uniqueUsers.length}`);

  fs.readFile(`./${folderName}/${OUTPUT_FILE_NAME}.json`, async (err, buf) => {
    if (!buf) {
      fs.writeFile(`./${folderName}/${OUTPUT_FILE_NAME}.json`, "[]", err => {
        if (err) {
          return console.error(err);
        }
      });
      deleteDuplicates();
    } else {
      fs.readFile(`./${folderName}/${OUTPUT_FILE_NAME}.json`, async (err, buf) => {
        fs.writeFile(
          `./${folderName}/${OUTPUT_FILE_NAME}.json`,
          JSON.stringify(uniqueUsers),
          err => {
            if (err) {
              return console.error(err);
            }
          }
        );
      });
    }
  });
}

// deleteDuplicates("polygon_v3", "all_users", "all_users");

module.exports = { deleteDuplicates };
