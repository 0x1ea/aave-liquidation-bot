const fs = require("fs");

async function deleteDuplicatesFromSomeFiles(
  folderName,
  fromFolder,
  toFolder,
  startIndex,
  endIndex
) {
  const start = startIndex;
  const end = endIndex;

  for (let i = start; i <= end; i++) {
    const userFile = require(`../${folderName}/${fromFolder}/${i}.json`);
    let uniqueUsersFile = [...new Set(userFile)];
    console.log(`File: ${i}, all users length: ${userFile.length}`);
    console.log(`File: ${i}, unique users length: ${uniqueUsersFile.length}`);

    fs.readFile(`./${folderName}/${toFolder}/${i}.json`, async (err, buf) => {
      if (!buf) {
        fs.writeFile(`./${folderName}/${toFolder}/${i}.json`, "[]", err => {
          if (err) {
            return console.error(err);
          }
        });
        // deleteDuplicatesFromSomeFiles();
      } else {
        fs.readFile(`./${folderName}/${toFolder}/${i}.json`, async (err, buf) => {
          fs.writeFile(
            `./${folderName}/${toFolder}/${i}.json`,
            JSON.stringify(uniqueUsersFile),
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
}

// deleteDuplicatesFromSomeFiles("data_polygon", "users", "uniqueUsers", 57, 87);

module.exports = { deleteDuplicatesFromSomeFiles };
