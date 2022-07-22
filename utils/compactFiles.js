const fs = require("fs");

async function extractUsers() {
  // Primero: creo el array donde iran todos los users
  let newData = [];
  const start = 0;
  const end = 87;
  const fromFolder = "uniqueUsers";
  const RETURNED_FILE_NAME = "allUsers_polygon";
  // Segundo: comienzo a recorrer los 18 archivos filtrados
  for (let i = start; i <= end; i++) {
    // Tercero: leo cada archivo dentro de la carpeta users
    fs.readFile(`./data/${fromFolder}/${i}.json`, async (err, buf) => {
      let save = buf.toString();
      const dataSet = await JSON.parse(save);
      // Recorro lo que esta dentro de cada archivo y lo sumo
      // al array de `users`
      dataSet.map(user => {
        newData.push(user);
      });
      console.log(newData.length);
      fs.writeFile(`./data/${RETURNED_FILE_NAME}.json`, JSON.stringify(newData), err => {
        if (err) {
          return console.error(err);
        }
      });
    });
  }
}

// extractUsers();

module.exports = { extractUsers };
