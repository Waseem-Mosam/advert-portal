const express = require("express");
const oracledb = require("oracledb");
const { Meilisearch } = require("meilisearch");
const notificationapi = require("notificationapi-node-server-sdk").default;
const request = require("request");



oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const dbConfig = {
	user: "mhu04972",
	password: "mhu04972",
	connectString: "10.0.18.2:1521/orcl",
};
var bodyParser = require("body-parser");
// create a new instance of the MsSearchService class
const client = new Meilisearch({
	host: "https://meilisearch-on-koyeb-meap.koyeb.app/",
	apiKey: "TEST_KEY",
});

const app = express();
app.use(express.json());

app.use(bodyParser.json());


app.get('/send-notification', (req, res) => {

	notificationapi.init(
		'59uh8hqb4k73g68c5i1rjfh0lp', // clientId
		'8ohqe8rl4rm6hqcb4828d0b5eb6m2rum28569pd4ln72ma095dl'// clientSecret
	)
	notificationapi.send({
		notificationId: 'new_comment',
		user: {
		  id: "waseem.mosam1@gmail.com",
		  email: "waseem.mosam1@gmail.com",
		  number: "72304776" // Replace with your phone number
		},
		mergeTags: {
		  "comment": "Build something great :)",
		  "commentId": "commentId-1234-abcd-wxyz"
		}
	})
	res.sendStatus(200);
});
  

const { auth, requiredScopes } = require("express-oauth2-jwt-bearer");

// Authorization middleware. When used, the Access Token must
// exist and be verified against the Auth0 JSON Web Key Set.
const jwtCheck = auth({
	secret: "nZ29VCk0IE14IWfw1E7mIGOlhRPIcCer",
	audience: "http://localhost:3000",
	issuerBaseURL: "https://dev-yxcvikhgd4lanrwd.us.auth0.com/",
	tokenSigningAlg: "HS256",
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

		// create advert in database
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

		// add advert to search index
		try {
			client.index("adverts").addDocuments([
				{
					// the advert_id is the primary key. Required by Meilisearch.
					primaryKey: advert_id,
					title: req.body.title,
					description: req.body.desc,
					price: req.body.price,
					seller_id: req.body.seller_id,
				},
			]);
		} catch (e) {
			console.log(e);
			res.send(400);
		}

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

// Text search for adverts
app.get("/adverts/search",async (req, res) => {
	// get search query
	const query = req.query.query;

	// add advert to search index
	try {
		await client
			.index("adverts")
			.search(query)
			.then((result) => {
				res.json(result);
			});
	} catch (e) {
		console.log(e);
		res.send(400);
	}
});

// Update Advert
app.put("/adverts/:advert_id", async (req, res) => {
	let conn;

	try {
		conn = await oracledb.getConnection(dbConfig);

		const advert_id = req.params.advert_id;
		const { title, description, price } = req.body;

		const result = await conn.execute(
			`UPDATE CSI345_ADVERT 
             SET TITLE = :title, DESCRIPTION = :description, PRICE = :price 
             WHERE ADVERTID = :advert_id`,
			[title, description, price, advert_id],
			{ autoCommit: true }
		);

		res.sendStatus(201);
	} catch (err) {
		console.error(err);
	} finally {
		if (conn) {
			await conn.close();
		}
	}
});

// Delete Advert
app.put("/advert/:advert_id", async (req, res) => {
	const advert_id = req.params.advert_id;

	try {
		connection = await oracledb.getConnection(dbConfig);
		const data = await connection.execute(
			`UPDATE CSI345_ADVERT  
                SET STATUS = 'Deleted'
                WHERE ADVERTID = :advert_id`,
			[advert_id],
			{ autoCommit: true }
		);
		res.json({ message: "Deleted" });
	} catch (err) {
		res.send(err);
	}
});

/**
 * Admin endpoints
 */

// Get Adverts
app.get("/adverts", async (req, res) => {
	let conn;

	try {
		conn = await oracledb.getConnection(dbConfig);

		const result = await conn.execute("SELECT * FROM CSI345_ADVERT");

		res.send(result.rows);
	} catch (err) {
		console.error(err);
	} finally {
		if (conn) {
			await conn.close();
		}
	}
});

// approve advert
app.post("/adverts/:advertId", async (req, res) => {
	let conn;
	let cred;
	try {
		conn = await oracledb.getConnection(dbConfig);

		const { advertId } = req.params;

		cred = await conn.execute(
			"UPDATE CSI345_ADVERT SET STATUS = 'Approved' WHERE ADVERTID = :advertId",
			[advertId],
			{ autoCommit: true }
		);

		const title = await conn.execute("SELECT title FROM CSI345_ADVERT WHERE ADVERTID = :advertId", [advertId]);
		console.log(title.rows[0].TITLE)
		const seller = await conn.execute("SELECT email FROM CSI345_USER WHERE USERID = (SELECT SELLERID FROM CSI345_ADVERT WHERE ADVERTID = :advertId)", [advertId]);
		notificationapi.init(
			'59uh8hqb4k73g68c5i1rjfh0lp', // clientId
			'8ohqe8rl4rm6hqcb4828d0b5eb6m2rum28569pd4ln72ma095dl'// clientSecret
		)
		notificationapi.send({
			notificationId: 'new_comment',
			user: {
			  id: seller.rows[0].EMAIL,
			  email: seller.rows[0].EMAIL,
			  number: "72304776" // Replace with your phone number
			},
			mergeTags: {
			  "comment": `Your advert "${title.rows[0].TITLE}" has been approved. Congratulations!`,
			  "commentId": "commentId-1234-abcd-wxyz"
			}
		})
		console.log(seller.rows[0].EMAIL);
		res.json(cred);
	} catch (err) {
		console.error(err);
	} finally {
		if (conn) {
			await conn.close();
		}
	}
});

// Get Reports
app.get("/reports", async (req, res) => {
	let conn;
	const { report_type } = req.query;
	try {
		conn = await oracledb.getConnection(dbConfig);
		let result;
		if (report_type == "sold") {
			result = await conn.execute(
				"SELECT * FROM CSI345_ADVERT WHERE TAG = 'Sold'"
			);
		} else if (report_type == "available") {
			result = await conn.execute(
				"SELECT * FROM CSI345_ADVERT WHERE TAG = 'Available'"
			);
		}

		res.send(result.rows);
	} catch (err) {
		console.error(err);
	} finally {
		if (conn) {
			await conn.close();
		}
	}
});

// login with Auth0
app.post("/login", async (req, res) => {
	let conn;
	let cred;
	var options = {
		method: "POST",
		url: "https://dev-yxcvikhgd4lanrwd.us.auth0.com/oauth/token",
		headers: { "content-type": "application/json" },
		body: '{"client_id":"lB8QxNyb5zSLkbZTj9fGDvos16f9QQh4","client_secret":"hqvFHzG-HJn6Q_OI-mQE_oiWcAQnrwXPI-bBMY8qjLseN9oaj-lL50abxyb8ntrA","audience":"http://localhost:3000","grant_type":"client_credentials"}',
	};

	try {
		conn = await oracledb.getConnection(dbConfig);

		const { email, password } = req.body;

		const result = await conn.execute(
			"SELECT * FROM CSI345_USER WHERE EMAIL = :email AND PASSWORD = :password",
			[email, password]
		);

		if (await result.rows[0]) {
			try {
				request(options, function (error, response, body) {
					if (error) throw new Error(error);
					const creds = JSON.parse(body);
					res.json({ access_token: creds.access_token });
				});
			} catch (err) {
				console.error(err);
			}
		} else {
			res.status(401).json({ status: 401, message: "User does not exist." });
		}
	} catch (err) {
		console.error(err);
	} finally {
		if (conn) {
			await conn.close();
		}
	}
});

const PORT = 3000;
app.listen(PORT, () => console.log("Listening on port " + PORT));
