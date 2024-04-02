const express = require("express");
const oracledb = require("oracledb");
const request = require("request");

const config = {
	user: "mhu04972",
	password: "mhu04972",
	connectString: "10.0.18.2:1521/orcl",
};

const app = express();
app.use(express.json());

const { auth, requiredScopes } = require("express-oauth2-jwt-bearer");

// Authorization middleware. When used, the Access Token must
// exist and be verified against the Auth0 JSON Web Key Set.
const jwtCheck = auth({
	secret: "nZ29VCk0IE14IWfw1E7mIGOlhRPIcCer",
	audience: "http://localhost:3000",
	issuerBaseURL: "https://dev-yxcvikhgd4lanrwd.us.auth0.com/",
	tokenSigningAlg: "HS256",
});

// This route doesn't need authentication
app.get("/api/public", function (req, res) {
	res.json({
		message:
			"Hello from a public endpoint! You don't need to be authenticated to see this.",
	});
});

// This route needs authentication
app.get("/api/private", jwtCheck, function (req, res) {
	res.json({
		message:
			"Hello from a private endpoint! You need to be authenticated to see this.",
	});
});

const checkScopes = requiredScopes("read:messages");

app.get("/api/private-scoped", jwtCheck, checkScopes, function (req, res) {
	res.json({
		message:
			"Hello from a private endpoint! You need to be authenticated and have a scope of read:messages to see this.",
	});
});

/**
 * Staff endpoints
 */

// Retrieve advert by staff ID
app.get("/staff/:staff_id/adverts", async (req, res) => {
	let connection;

	var staff_id = req.params.staff_id;

	try {
		connection = await oracledb.getConnection(dbConfig);
		const data = await connection.execute(
			`SELECT * 
             FROM CSI345_ADVERT
             WHERE SELLERID = :staff_id`,
			[staff_id]
		);
		res.json(data.rows);
	} catch (err) {
		res.send(err);
	}
});

// Retrieve all adverts
app.get("/staff/adverts", async (req, res) => {
	let connection;
	try {
		connection = await oracledb.getConnection(dbConfig);
		const data = await connection.execute(
			`SELECT * 
             FROM CSI345_ADVERT
             WHERE NOT STATUS = 'Deleted' AND NOT STATUS = 'Pending'`
		);
		res.json(data.rows);
	} catch (err) {
		res.send(err);
	}
});

// Create Advert
app.post("/adverts", async (req, res) => {
	let connection;

	const advert_id = Math.floor(100000 + Math.random() * 900000); // generate a random 6-digit number

	try {
		connection = await oracledb.getConnection(dbConfig);

		const data = await connection.execute(
			`INSERT INTO CSI345_ADVERT (ADVERTID, TITLE, DESCRIPTION, PRICE, SELLERID) 
             VALUES (:1, :2, :3, :4, :5)`,
			[
				advert_id,
				req.body.title,
				req.body.desc,
				req.body.price,
				req.body.seller_id,
			],
			{ autoCommit: true }
		);
		res.send(201);
	} catch (err) {
		res.send(err);
	}
});

// Adverts by AdvertID
app.get("/advert/:advert_id", async (req, res) => {
	let connection;
	const advert_id = req.params.advert_id;

	try {
		connection = await oracledb.getConnection(dbConfig);
		const data = await connection.execute(
			`SELECT *
             FROM CSI345_ADVERT
             WHERE ADVERTID = :advert_id`,
			[advert_id]
		);
		res.json(data.rows);
	} catch (err) {
		res.send(err);
	}
});

// Update Advert
app.put("/adverts/:id", async (req, res) => {
	let conn;

	try {
		conn = await oracledb.getConnection(config);

		const advert_id = req.params.advert_id;
		const { title, description, price } = req.body;

		const result = await conn.execute(
			"UPDATE ADVERTS SET TITLE = :title, DESCRIPTION = :description, PRICE = :price WHERE ID = :id",
			[title, description, price, id]
		);

		res.send(result.rows);
	} catch (err) {
		console.error(err);
	} finally {
		if (conn) {
			await conn.close();
		}
	}
});

/* Administrator endpoints */

// Get Adverts
app.get("/aderts", async (req, res) => {
	let conn;

	try {
		conn = await oracledb.getConnection(config);

		const result = await conn.execute("SELECT * FROM ADVERTS");

		res.send(result.rows);
	} catch (err) {
		console.error(err);
	} finally {
		if (conn) {
			await conn.close();
		}
	}
});
