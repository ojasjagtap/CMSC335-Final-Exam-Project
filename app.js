process.stdin.setEncoding("utf8");
const bodyParser = require("body-parser");
const http = require("http");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const { MongoClient, ServerApiVersion } = require("mongodb");
const user = process.env.MONGO_DB_USERNAME;
const pass = process.env.MONGO_DB_PASSWORD;
const database = {
  db: process.env.MONGO_DB_NAME,
  collect: process.env.MONGO_COLLECTION,
};
const portNumber = process.argv[2];
const express = require("express");
const app = express();

app.set("views", path.resolve(__dirname, "pages"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

const url = `mongodb+srv://${user}:${pass}@cluster0.jir3uzg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(url, {
  serverApi: ServerApiVersion.v1,
});
const initializeDatabase = async () => {
  try {
    await client.connect();
  } catch (error) {
    process.exit(1);
  }
};
initializeDatabase();

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/weather", async (req, res) => {
  const lat = parseFloat(req.body.lat);
  const lon = parseFloat(req.body.lon);

  try {
    const mem = await client
      .db(database.db)
      .collection(database.collect)
      .findOne({ lat: lat, lon: lon });

    if (mem) {
      res.render("weather", {
        city: mem.city,
        temp: mem.temp,
      });
    } else {
      const options = {
        method: "GET",
        url: "https://weatherbit-v1-mashape.p.rapidapi.com/current",
        params: {
          lon: lon,
          lat: lat,
        },
        headers: {
          "X-RapidAPI-Key":
            "be40963ff5msh36c30082b35be85p1dc1f5jsn4d27d5cb3ce4",
          "X-RapidAPI-Host": "weatherbit-v1-mashape.p.rapidapi.com",
        },
      };

      const response = await axios.request(options);

      await client.db(database.db).collection(database.collect).insertOne({
        lat: lat,
        lon: lon,
        city: response.data["data"][0].city_name,
        temp: response.data["data"][0].app_temp,
      });

      res.render("weather", {
        city: response.data["data"][0].city_name,
        temp: response.data["data"][0].app_temp,
      });
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});

app.listen(portNumber);

process.stdin.on("readable", () => {
  let dataInput = process.stdin.read();
  if (dataInput !== null) {
    let command = dataInput.trim();
    if (command === "stop") {
      process.exit(0);
    }
  }
});
