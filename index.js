const express = require('express');
const oracledb = require('oracledb');

const app = express();
app.use(express.json());

const PORT = 3000;
app.listen(PORT, () => console.log("Listening on port " + PORT));

