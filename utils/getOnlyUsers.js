const fs = require("fs");
const { compactFiles } = require("./compactFiles");
const { deleteDuplicatesFromSomeFiles } = require("./deleteDuplicatesFromSomeFiles");
/**
 *
 * @param {string} folderName desde donde se van a leer los archivos
 * @param {int} startNumber desde donde va empezar a leer los archivos
 * @param {int} endNumber hasta donde se van a leer los archivos
 */
async function getOnlyUsers(folderName, startNumber, endNumber) {
  const start = startNumber;
  const index = endNumber;
  // Primero debo recorrer los 18 archivos que estan en la carpeta de /data/events
  for (let i = start; i <= index; i++) {
    /**
     * Una vez creado el archivo procedo a leer el archivo de events
     * para luego mapearlo y extraer los datos necesarios para
     * finalmente guardarlo en un nuevo archivo dentro de la carpeta
     * /data/users
     */
    fs.readFile(`./${folderName}/events/${i}.json`, async (err, buf) => {
      let save = buf.toString();
      const events = await JSON.parse(save);
      const users = [];
      events.map(event => {
        /* const info = {
          user: event.returnValues.user,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        }; */
        users.push(event.returnValues.user);
      });

      fs.writeFile(`./${folderName}/users/${i}.json`, JSON.stringify(users), err => {
        if (err) {
          return console.error(err);
        }
      });
    });
  }
}

module.exports = { getOnlyUsers };

// getOnlyUsers("polygon_v3", 1, 25);
// deleteDuplicatesFromSomeFiles("polygon_v3", "users", "uniqueUsers", 1, 25);
compactFiles("polygon_v3", "uniqueUsers", "all_users", 1, 25);
