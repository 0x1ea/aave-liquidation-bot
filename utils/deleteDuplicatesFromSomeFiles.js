const fs = require("fs");

async function deleteDuplicatesFromSomeFiles() {
  const start = 57;
  const end = 87;

  for (let i = start; i <= end; i++) {
    const userFile = require(`../data/users/${i}.json`);
    let uniqueUsersFile = [...new Set(userFile)];
    console.log(`File: ${i}, all users length: ${userFile.length}`);
    console.log(`File: ${i}, unique users length: ${uniqueUsersFile.length}`);

    fs.readFile(`./data/uniqueUsers/${i}.json`, async (err, buf) => {
      if (!buf) {
        fs.writeFile(`./data/uniqueUsers/${i}.json`, "[]", err => {
          if (err) {
            return console.error(err);
          }
        });
        // deleteDuplicatesFromSomeFiles();
      } else {
        fs.readFile(`./data/uniqueUsers/${i}.json`, async (err, buf) => {
          fs.writeFile(
            `./data/uniqueUsers/${i}.json`,
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

// deleteDuplicatesFromSomeFiles();

module.exports = { deleteDuplicatesFromSomeFiles };
