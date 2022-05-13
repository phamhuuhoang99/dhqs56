const { Client } = require("pg");

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const queryOne = async (sql, params) => {
  try {
    const res = await client.query(sql, params);
    return res.rows[0];
  } catch (err) {
    console.log(err);
  }
};

const query = async (sql, params) => {
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  client,
  query,
  queryOne,
};
