const fs = require("fs");

/**
 * Función para crear un json con rangos de 2000 bloques
 * @param {string} folderName - nombre de la carpeta donde se va a guardar el archivo
 * @param {string} fileName - nombre del archivo donde se va guardar el archivo
 * @param {int} step - cantidad de bloques por petición. Máximo: 2000
 * @param {int} initialBlock - bloque inicial de la petición
 * @param {int} latestBlock - bloque final de la petición
 */
async function createBlockData(folderName, fileName, step, initialBlock, latestBlock) {
  let block = initialBlock || 11362579;
  const toBlock = latestBlock || 15185805;
  const data = [];

  while (block <= latestBlock) {
    const info = {
      fromBlock: block,
      toBlock: block + step,
      saved: false
    };
    block = block + step + 1;
    data.push(info);
  }

  fs.writeFile(`./${folderName}/${fileName}_${step}.json`, JSON.stringify(data), err => {
    if (err) {
      return console.error(err);
    }
  });

  console.log(`${fileName}_${step}.json written successfully!`);
}

// createBlockData("polygon_v3", "blocks", 2000, 25826028, 31062807);

module.exports = { createBlockData };
