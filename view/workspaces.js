const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();

const pool = require("../index");

// workspaces
router.post("/", jsonParser, addWorkspace);
// router.delete("/", jsonParser, deleteWorkspace);
router.put("/", jsonParser, updateWorkspace);
router.get("/protected", jsonParser, getWorkspaceProtected);

module.exports = router;

function getWorkspaceProtected(req, reshttp) {
	const user_id = req.query.user_id;
	const workspace_id = req.query.workspace_id;
	pool.getConnection((err, connection) => {
		if (err) throw err;
		isUserInWorkspace(user_id, workspace_id, connection, (res) => {
			if (res) {
				connection.query(
					`select protect from workspaces where id = ${workspace_id}`,
					(err, res) => {
						if (err) throw err;
						connection.release();
						reshttp.end(
							JSON.stringify({
								message: "protected workspace?",
								protected: res[0].protect,
								variant: "success",
							})
						);
						return;
					}
				);
			} else {
				connection.release();
				reshttp.end(
					JSON.stringify({
						message: "workspace created, and user inserted",
						id: res[0],
						variant: "success",
					})
				);
				return;
			}
		});
	});
}

function addWorkspace(req, reshttp) {
	// if (
	// 	!req.body?.user_id ||
	// 	!req.body?.workspace_name ||
	// 	!req.body?.workspace_secret
	// ) {
	// 	reshttp.setHeader("Content-Type", "application/json");
	// 	reshttp.end(
	// 		JSON.stringify({
	// 			message: "Not enough arguments",
	// 			variant: "warning",
	// 		})
	// 	);
	// 	return;
	// }
	const user_id = parseInt(req.query.user_id);
	const name = req.query.name;
	const secret = req.query.secret;
	const protect = req.query.protect;
	const edit_key = req.query.edit_key;
	console.log(req.query);
	pool.getConnection((err, connection) => {
		if (err) throw err;
		connection.query(
			`insert into workspaces (name, secret, protect, edit_key) values ('${name}', '${secret}', ${protect}, '${edit_key}')`,
			(err, res) => {
				if (err) throw err;
				connection.query(
					`select max(id) from workspaces where name = '${name}' and secret = '${secret}'`,
					(err, res) => {
						if (err) throw err;
						console.log(res);
						const workspace_id = res[0]["max(id)"];
						connection.query(
							`insert into users_workspaces (user_id, workspace_id) values (${user_id}, '${workspace_id}')`,
							(err, res) => {
								if (err) throw err;
								reshttp.setHeader(
									"Content-Type",
									"application/json"
								);
								reshttp.end(
									JSON.stringify({
										message:
											"workspace created, and user inserted",
										id: res[0],
										variant: "success",
									})
								);
								return;
							}
						);
					}
				);
			}
		);
	});
}

function updateWorkspace(req, reshttp) {
	const name = req.query.name;
	const user_id = req.query.user_id;
	const workspace_id = req.query.workspace_id;
	const secret = req.query.secret;
	const edit_key = req.query.edit_key;
	pool.getConnection((err, connection) => {
		if (err) throw err;
		isUserInWorkspace(user_id, workspace_id, connection, (res) => {
			if (res) {
				connection.query(
					`select secret, edit_key from workspaces where id = ${workspace_id}`,
					(err, res) => {
						if (err) throw err;
						if (
							res[0].edit_key === edit_key &&
							res[0].secret === secret
						) {
							connection.query(
								`update workspaces set name = '${name}' where id = ${workspace_id}`,
								(err) => {
									if (err) throw err;
									connection.release();
									reshttp.setHeader(
										"Content-Type",
										"application/json"
									);
									reshttp.end(
										JSON.stringify({
											message: "workspace name updated",
											variant: "success",
										})
									);
									return;
								}
							);
						} else {
							connection.release();
							reshttp.setHeader(
								"Content-Type",
								"application/json"
							);
							reshttp.end(
								JSON.stringify({
									message:
										"secret key or edit key is incorrect",
									variant: "error",
								})
							);
							return;
						}
					}
				);
			} else {
				connection.release();
				reshttp.setHeader("Content-Type", "application/json");
				reshttp.end(
					JSON.stringify({
						message:
							"user id isn't in this workspace, or workspace doesn't exist",
						variant: "error",
					})
				);
				return;
			}
		});
	});
}

const isUserInWorkspace = (user_id, workspace_id, connection, callback) => {
	connection.query(
		`select user_id from users_workspaces where user_id = ${user_id} and workspace_id = ${workspace_id}`,
		(err, res) => {
			if (err) throw err;
			console.log(res);
			if (res.length > 0) {
				console.log("res true");
				callback(true);
			} else {
				callback(false);
			}
		}
	);
};

// function deleteWorkspace(req, reshttp) {

// 	pool.getConnection((err, connection) => {
// 		if (err) throw err;
// 		connection.query(
// 			`select secret from workspaces where id = ${req.body.workspace_id} and name = ${req.body.workspace_name}`,
// 			(err, res) => {
// 				if (err) throw err;
// 				if (res.length > 0) {
// 					bcrypt.compare(
// 						req.body.workspace_secret,
// 						res[0].secret,
// 						(err, result) => {
// 							if (err) throw err;
// 							if (result) {
// 								connection.query(
// 									`delete from users_workspaces_coffees where workspace id = ${req.body.workspace_id}`,
// 									(err, res) => {
// 										if (err) throw err;
// 										connection.query(
// 											`delete from users_workspaces where workspace_id = ${req.body.workspace_id}`,
// 											(err, res) => {
// 												if (err) throw err;
// 												connection.query(
// 													`delete from workspaces where id = ${req.body.workspace_id}`,
// 													(err, res) => {
// 														if (err) throw err;
// 														reshttp.setHeader(
// 															"Content-Type",
// 															"application/json"
// 														);
// 														reshttp.end(
// 															JSON.stringify({
// 																message:
// 																	"workspace successfuly deleted",
// 																variant:
// 																	"success",
// 															})
// 														);
// 														return;
// 													}
// 												);
// 											}
// 										);
// 									}
// 								);
// 							}
// 						}
// 					);
// 				}
// 			}
// 		);
// 	});
// }
