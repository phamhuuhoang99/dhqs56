const express = require("express");
const cors = require("cors");
require("dotenv").config();
//----------------------------------------------------------------
const db = require("./utils/db");
//----------------------------------------------------------------
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(cors());

//--connect database ----
db.client.connect((err) => {
  if (err) console.log(err);
  else console.log(`connected to database ${process.env.DB_NAME} !!!`);
});

app.post("/api/add", async (req, res) => {
  const { name, geom } = req.body;

  const data = await db.query(
    "INSERT INTO data (name,geom) VALUES($1,ST_GeomFromGeoJson($2))",
    [name, geom]
  );
  res.send(data);
});

app.put("/api/edit/:id", async (req, res) => {
  const { id } = req.params;
  const { geom } = req.body;

  const data = await db.query(
    "UPDATE data SET geom = ST_GeomFromGeoJson($1) WHERE id = $2",
    [geom, id]
  );
  res.send(data);
});

app.delete("/api/delete/:id", async (req, res) => {
  const { id } = req.params;

  const data = await db.query("DELETE FROM data WHERE id = $1", [id]);
  res.send(data);
});

const PORT = process.env.API_PORT;
app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log(`app listen at ${PORT}`);
});
