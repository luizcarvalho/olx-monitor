const path = require('path')
const config = require('../config')
const sqlite = require("sqlite3").verbose()

const dbPath = path.join(__dirname, '../', config.dbFile);
console.log('Database path:', dbPath);

// Create the SQLite database connection
const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Database connection successful!');
  }
});


const createTables = async () => {


  // Define separate SQL statements for each table creation
  const queries = [
    `
    CREATE TABLE IF NOT EXISTS "ads" (
        "id"            INTEGER NOT NULL UNIQUE,
        "searchTerm"    TEXT NOT NULL,
        "title"	        TEXT NOT NULL,
        "price"         INTEGER NOT NULL,
        "size"          INTEGER NOT NULL,
        "location_city"      TEXT NOT NULL,
        "location_neighbourhood"      TEXT NOT NULL,
        "url"           TEXT NOT NULL,
        "created"       TEXT NOT NULL,
        "lastUpdate"    TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS "logs" (
        "id"            INTEGER NOT NULL UNIQUE,
        "url"           TEXT NOT NULL,  
        "adsFound"      INTEGER NOT NULL, 
        "averagePrice"  NUMERIC NOT NULL,
        "minPrice"      NUMERIC NOT NULL,
        "maxPrice"      NUMERIC NOT NULL, 
        "created"       TEXT NOT NULL,
        PRIMARY KEY("id" AUTOINCREMENT)
    );`
  ];

  return new Promise(function(resolve, reject) {
    // Iterate through the array of queries and execute them one by one
    const executeQuery = (index) => {
     
      if (index === queries.length) {
        resolve(true); // All queries have been executed
        return;
      }

      db.run(queries[index], function(error) {
        if (error) {
          reject(error);
          return;
        }

        // Execute the next query in the array
        executeQuery(index + 1);
      });
    };

    // Start executing the queries from index 0
    executeQuery(0);
  });
}

module.exports = {
  db,
  createTables
}
