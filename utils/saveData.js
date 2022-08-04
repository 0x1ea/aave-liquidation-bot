const fs = require("fs");

/**
 * Funcion para crear y actualizar un archivo dado dos parametros
 * @param {string} folderName - nombre de la carpeta base
 * @param {string} fileName - nombre del archivo que se va a editar
 * @param {array} dataSet - informacion que va ser anadida al archivo, ya debe
 *                          estar formateado dentro de un array.
 */
async function saveData(folderName, fileName, dataSet) {
  fs.readFile(`./data/${folderName}/${fileName}.json`, async (err, buf) => {
    if (!buf) {
      fs.writeFile(`./data/${folderName}/${fileName}.json`, "[]", (err) => {
        if (err) {
          return console.error(err);
        }
      });
    } else {
      fs.readFile(`./data/${folderName}/${fileName}.json`, async (err, buf) => {
        let save = buf.toString();
        const newSave = await JSON.parse(save);

        // dataSet.map(data => {
        newSave.push(dataSet);
        // });

        fs.writeFile(
          `./data/${folderName}/${fileName}.json`,
          JSON.stringify(newSave),
          (err) => {
            if (err) {
              return console.error(err);
            }
          }
        );
      });
    }
  });
}

module.exports = { saveData };
