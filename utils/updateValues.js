const fs = require("fs");

/**
 * Funcion para actualizar los valores dentro del archivo de index.json
 * Este archivo lleva la cuenta de por cual user se está leyendo la información
 *
 * @param {string} folderName - nombre de la carpeta base
 * @param {string} fileName - nombre del archivo que se va a editar
 * @param {array} dataSet - informacion que se va a escribir
 */
async function updateValues(folderName, fileName, dataSet, index) {
  // if (index) {
  fs.readFile(`./${folderName}/${fileName}.json`, async (err, buf) => {
    if (!buf) {
      fs.writeFile(`./${folderName}/${fileName}.json`, "[]", err => {
        if (err) {
          return console.error(err);
        }
      });
    } else {
      fs.readFile(`./${folderName}/${fileName}.json`, async (err, buf) => {
        let save = buf.toString();
        const newSave = await JSON.parse(save);
        newSave[index] = dataSet;

        fs.writeFile(`./${folderName}/${fileName}.json`, JSON.stringify(newSave), err => {
          if (err) {
            return console.error(err);
          }
        });
      });
    }
  });
}

module.exports = { updateValues };
