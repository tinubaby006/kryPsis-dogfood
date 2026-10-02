const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://dogfood:dogfoodpassword@127.0.0.1:5432/postgres' });
client.connect().then(() => client.query('CREATE DATABASE dogfood_test')).then(() => {
    console.log("DB Created");
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
