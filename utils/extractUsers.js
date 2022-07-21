const fs = require("fs");

async function extractUsers() {
  // Primero: creo el array donde iran todos los users
  let newData = [];
  // Segundo: comienzo a recorrer los 18 archivos filtrados
  for (let i = 0; i <= 18; i++) {
    // Tercero: leo cada archivo dentro de la carpeta users
    fs.readFile(`./data/users/${i}.json`, async (err, buf) => {
      let save = buf.toString();
      const dataSet = await JSON.parse(save);
      // Recorro lo que esta dentro de cada archivo y lo sumo
      // al array de `users`
      dataSet.map(someData => {
        newData.push(someData.user);
        // console.log(someData.user);
      });
      console.log(newData.length);
      // if (i === 18) {
      fs.writeFile(`./data/raw_all_users.json`, JSON.stringify(newData), err => {
        if (err) {
          return console.error(err);
        }
      });
      // }
    });
  }
}

extractUsers();

module.exports = { extractUsers };
