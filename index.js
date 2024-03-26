const express = require("express");
const oracledb = require("oracledb");

const config = {
    user: "mhu04972",
    password: "mhu04972",
    connectString: "10.0.18.2:1521/orcl"
}

const app = express();
app.use(express.json());

const PORT = 3000;
app.listen(PORT, () => console.log("Listening on port " + PORT));

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


/* Staff Member endpoints */

// Update Advert
app.put('/adverts', async (req, res) => {
	let conn;

    

	try{
		conn = await oracledb.getConnection(config);

		const advert_id = req.query.id;
		const { title, description, price } = req.body;

		const result = await conn.execute(
			'UPDATE CSI345_ADVERT SET TITLE = :title, DESCRIPTION = :description, PRICE = :price WHERE ADVERTID = :advert_id',
			[title, description, price, advert_id], { autoCommit: true }
		);

		res.sendStatus(201);

	}catch(err){
		console.error(err);
	}finally{
		if(conn){
			await conn.close();
		}
	}
})


/* Administrator endpoints */

// Get Adverts
app.get('/adverts', async (req, res) => {
	let conn;

    try{
        conn = await oracledb.getConnection(config);

        const result = await conn.execute('SELECT * FROM CSI345_ADVERT');

        res.send(result.rows);

    }catch(err){
        console.error(err);
    }finally{
        if(conn){
            await conn.close();
        }
    }
})


// approve advert
app.post("/adverts/:advertId", async (req, res) => {
	let conn;
	let cred;
	try {
		conn = await oracledb.getConnection(config);

		const { advertId } = req.params;

		cred = await conn.execute(
			"UPDATE CSI345_ADVERT SET STATUS = 'Approved' WHERE ADVERTID = :advertId",
			[advertId],
			{ autoCommit: true }
		);

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
		conn = await oracledb.getConnection(config);
		let result
		if (report_type == "sold"){
			result = await conn.execute("SELECT * FROM CSI345_ADVERT WHERE TAG = 'Sold'");
		}

		else if(report_type == "available"){
			result = await conn.execute("SELECT * FROM CSI345_ADVERT WHERE TAG = 'Available'");
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
		conn = await oracledb.getConnection(config);

		const { email, password } = req.body;

		const result = await conn.execute(
			"SELECT * FROM CSI345_USER WHERE EMAIL = :email AND PASSWORD = :password",
			[email, password]
		);

		if(await result.rows[0]){
			try {
				request(options, function (error, response, body) {
					if (error) throw new Error(error);
					res.json(body)
				});
			} catch (err) {
				console.error(err);
			}
		}else{
			res.status(401).json({status:401,message:"User does not exist."});
		}

	} catch (err) {
		console.error(err);
	} finally {
		if (conn) {
			await conn.close();
		}
	}
});
