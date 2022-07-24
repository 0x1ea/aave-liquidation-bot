const fs = require("fs");

/**
 *
 * @param {string} folderName carpeta base de los datos
 * @param {string} fromFolder carpeta donde se van a leer los archivos
 * @param {string} outputFile nombre del archivo resultante
 * @param {int} startIndex indice por el que se va a empezar
 * @param {int} endIndex indice por el que se a terminar
 */
async function compactFiles(folderName, fromFolder, outputFile, startIndex, endIndex) {
  // Primero: creo el array donde iran todos los users
  let newData = [];
  const start = startIndex;
  const end = endIndex;
  const FROM_FOLDER = fromFolder;
  const RETURNED_FILE_NAME = outputFile;
  // Segundo: comienzo a recorrer los 18 archivos filtrados
  for (let i = start; i <= end; i++) {
    // Tercero: leo cada archivo dentro de la carpeta users
    fs.readFile(`./${folderName}/${FROM_FOLDER}/${i}.json`, async (err, buf) => {
      let save = buf.toString();
      const dataSet = await JSON.parse(save);
      // Recorro lo que esta dentro de cada archivo y lo sumo
      // al array de `users`
      dataSet.map(user => {
        newData.push(user);
      });
      console.log(newData.length);
      fs.writeFile(
        `./${folderName}/${RETURNED_FILE_NAME}.json`,
        JSON.stringify(newData),
        err => {
          if (err) {
            return console.error(err);
          }
        }
      );
    });
  }
}

module.exports = { compactFiles };

// extractUsers("data_polygon", "users", "uniqueUsers", "allUsers_polygon", 0, 87);
