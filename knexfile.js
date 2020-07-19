// Update with your config settings.

module.exports = {

  development: {
    client: 'sqlite3',
    connection: {
      filename: './src/database/db.sqlite'
    },
    migrations: {
      directory: './src/database/migrations'
    },
    useNullAsDefault: true,
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
