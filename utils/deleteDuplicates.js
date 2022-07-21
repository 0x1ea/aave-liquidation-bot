const fs = require("fs");
const allUsers = require("../data/raw_all_users.json");

async function deleteDuplicates() {
  let uniqueUsers = [...new Set(allUsers)];
  console.log(uniqueUsers.length);

  fs.readFile(`./data/all_users.json`, async (err, buf) => {
    if (!buf) {
      fs.writeFile(`./data/all_users.json`, "[]", err => {
        if (err) {
          return console.error(err);
        }
      });
      deleteDuplicates();
    } else {
      fs.readFile(`./data/all_users.json`, async (err, buf) => {
        fs.writeFile(`./data/all_users.json`, JSON.stringify(uniqueUsers), err => {
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
