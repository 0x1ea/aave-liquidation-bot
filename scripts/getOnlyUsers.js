const fs = require("fs");
const { compactFiles } = require("../utils/compactFiles");
const {
  deleteDuplicatesFromSomeFiles
} = require("../utils/deleteDuplicatesFromSomeFiles");
const { deleteDuplicates } = require("../utils/deleteDuplicates");

/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */
const OUTPUT_FOLDER_NAME = "optimism_v3";
const FROM_FILE = 0;
const TO_FILE = 0;
const EVENT_VALUE = "0";

/**
 *
 * @param {string} folderName desde donde se van a leer los archivos
 * @param {int} startNumber desde donde va empezar a leer los archivos
 * @param {int} endNumber hasta donde se van a leer los archivos
 * @param {string} value nombre del valor del evento que se va a extraer
 */
async function getOnlyUsers(folderName, startNumber, endNumber, value) {
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
        users.push(event.returnValues[value]);
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

// "users" || "0"

// getOnlyUsers(OUTPUT_FOLDER_NAME, FROM_FILE, TO_FILE, EVENT_VALUE);
// deleteDuplicatesFromSomeFiles(
//   OUTPUT_FOLDER_NAME,
//   "users",
//   "uniqueUsers",
//   FROM_FILE,
//   TO_FILE
// );

// compactFiles(OUTPUT_FOLDER_NAME, "uniqueUsers", "all_users", TO_FILE, TO_FILE);

// deleteDuplicates(OUTPUT_FOLDER_NAME, "all_users", "all_users");
