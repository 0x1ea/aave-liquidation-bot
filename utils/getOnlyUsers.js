const fs = require("fs");

async function getOnlyUsers() {
  const start = 57;
  const index = 87;
  // Primero debo recorrer los 18 archivos que estan en la carpeta de /data/events
  for (let i = start; i <= index; i++) {
    /**
     * Una vez creado el archivo procedo a leer el archivo de events
     * para luego mapearlo y extraer los datos necesarios para
     * finalmente guardarlo en un nuevo archivo dentro de la carpeta
     * /data/users
     */
    fs.readFile(`./data/events/${i}.json`, async (err, buf) => {
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

      fs.writeFile(`./data/users/${i}.json`, JSON.stringify(users), err => {
        if (err) {
          return console.error(err);
        }
      });
    });
  }
}

// getOnlyUsers();

module.exports = { getOnlyUsers };
