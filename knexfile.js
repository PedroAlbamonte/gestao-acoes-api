// Update with your config settings.
require('dotenv').config();

module.exports = {

  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL, 
    // connection: process.env.DATABASE_URL + '?ssl=true&sslmode=require&rejectUnauthorized=false', 
    // connection: process.env.DATABASE_URL + '?ssl=true&sslmode=verify-ca&sslfactory=org.postgresql.ssl.NonValidatingFactory', 
    migrations: {
      directory: __dirname + '/src/database/migrations',
    }
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL, 
    // connection: process.env.DATABASE_URL + '?ssl=true&sslmode=require&rejectUnauthorized=false', 
    // connection: process.env.DATABASE_URL + '?ssl=true&sslmode=verify-ca&sslfactory=org.postgresql.ssl.NonValidatingFactory', 
    migrations: {
      directory: __dirname + '/src/database/migrations',
    }
  }

};
