const fs = require("fs");

/**
 *
 * @param {string} folderName nombre de la carpeta donde se va guardar el archivo
 * @param {string} fileName nombre del archivo que se va leer
 * @param {int} index indice del step que se va a modificar
 */
async function updateBlocks(folderName, fileName, index) {
  fs.readFile(`./${folderName}/${fileName}.json`, async (err, buf) => {
    let save = buf.toString();
    const newSave = await JSON.parse(save);

    newSave[index].saved = true;

    fs.writeFile(`./${folderName}/${fileName}.json`, JSON.stringify(newSave), err => {
      if (err) {
        return console.error(err);
      }
    });
  });
}

module.exports = { updateBlocks };
