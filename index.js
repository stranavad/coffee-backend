const express = require("express");
const app = express();
const mysql = require("mysql");
// const bodyParser = require('body-parser');
// const jsonParser = bodyParser.json();

// Mysql connection
const pool = mysql.createPool({
	host: "139.162.161.156",
	user: "root",
	password: "<Code><Tech> 127521",
	database: "coffee",
	connectionLimit: 5,
});

module.exports = pool;

const user = require("./view/user");
const coffees = require("./view/coffees");
const workspaces = require("./view/workspaces");

app.use("/user", user);
app.use("/coffees", coffees);
app.use("/workspaces", workspaces);
app.listen(3001);
