const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();

const pool = require("../index");

// workspaces
router.post("/", jsonParser, addWorkspace);
// router.delete("/", jsonParser, deleteWorkspace);
// router.put("/", jsonParser, updateWorkspace);
router.get("/protected", jsonParser, getWorkspaceProtected);
router.post("/protected", jsonParser, verifyProtectKey);

module.exports = router;

function verifyProtectKey(req, reshttp) {
	const userId = req.body.userId;
	const workspaceId = req.body.workspaceId;
	const editKey = req.body.editKey;

	pool.getConnection((err, connection) => {
		if (err) throw err;
		isUserInWorkspace(userId, workspaceId, connection, (res) => {
			if (res) {
				connection.query(
					`select protect, edit_key from workspaces where id = ${workspaceId}`,
					(err, res) => {
						if (err) throw err;
						if (res) {
							connection.release();
							console.log(res);
							if (res[0].protect && res[0].edit_key === editKey) {
								reshttp.end(
									JSON.stringify({
										message: "verified",
										verified: true,
										variant: "success",
									})
								);
								return;
							} else if (!res[0].protect) {
								reshttp.end(
									JSON.stringify({
										message:
											"this workspace isn't protected",
										verified: true,
										variant: "success",
									})
								);
								return;
							} else if (
								res[0].protect &&
								res[0].edit_key !== editKey
							) {
								reshttp.end(
									JSON.stringify({
										message: "not verified",
										verified: false,
										variant: "success",
									})
								);
								return;
							}
						} else {
							connection.release();
							reshttp.end(
								JSON.stringify({
									message: "no workspace with this id",
									variant: "warning",
								})
							);
							return;
						}
					}
				);
			} else {
				connection.release();
				reshttp.end(
					JSON.stringify({
						message: "user isn't in this workspace",
						variant: "error",
					})
				);
				return;
			}
		});
	});
}

function getWorkspaceProtected(req, reshttp) {
	const userId = req.query.userId;
	const workspaceId = req.query.workspaceId;
	pool.getConnection((err, connection) => {
		if (err) throw err;
		isUserInWorkspace(userId, workspaceId, connection, (res) => {
			if (res) {
				connection.query(
					`select protect from workspaces where id = ${workspaceId}`,
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
	const userId = req.body.userId;
	const name = req.body.name;
	const secret = req.body.secret;
	const protect = req.body.protect;
	const editKey = protect ? req.body.editKey : "";

	pool.getConnection((err, connection) => {
		if (err) throw err;
		connection.query(
			`insert into workspaces (name, secret, protect, edit_key) values ('${name}', '${secret}', ${protect}, '${editKey}')`,
			(err, res) => {
				if (err) throw err;
				connection.query(
					`select max(id) from workspaces where name = '${name}' and secret = '${secret}'`,
					(err, res) => {
						if (err) throw err;
						const workspaceId = res[0]["max(id)"];
						connection.query(
							`insert into users_workspaces (user_id, workspace_id) values (${userId}, '${workspaceId}')`,
							(err, res) => {
								if (err) throw err;
								connection.release();
								reshttp.setHeader(
									"Content-Type",
									"application/json"
								);
								reshttp.end(
									JSON.stringify({
										message:
											"created",
										id: workspaceId,
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

// function updateWorkspace(req, reshttp) {
// 	const name = req.query.name;
// 	const userId = req.query.userId;
// 	const workspaceId = req.query.workspaceId;
// 	const secret = req.query.secret;
// 	const editKey = req.query.editKey;

// 	pool.getConnection((err, connection) => {
// 		if (err) throw err;
// 		isUserInWorkspace(userId, workspaceId, connection, (res) => {
// 			if (res) {
// 				connection.query(
// 					`select secret, edit_key from workspaces where id = ${workspaceId}`,
// 					(err, res) => {
// 						if (err) throw err;
// 						if (
// 							res[0].edit_key === editKey &&
// 							res[0].secret === secret
// 						) {
// 							connection.query(
// 								`update workspaces set name = '${name}' where id = ${workspaceId}`,
// 								(err) => {
// 									if (err) throw err;
// 									connection.release();
// 									reshttp.setHeader(
// 										"Content-Type",
// 										"application/json"
// 									);
// 									reshttp.end(
// 										JSON.stringify({
// 											message: "workspace name updated",
// 											variant: "success",
// 										})
// 									);
// 									return;
// 								}
// 							);
// 						} else {
// 							connection.release();
// 							reshttp.setHeader(
// 								"Content-Type",
// 								"application/json"
// 							);
// 							reshttp.end(
// 								JSON.stringify({
// 									message:
// 										"secret key or edit key is incorrect",
// 									variant: "error",
// 								})
// 							);
// 							return;
// 						}
// 					}
// 				);
// 			} else {
// 				connection.release();
// 				reshttp.setHeader("Content-Type", "application/json");
// 				reshttp.end(
// 					JSON.stringify({
// 						message:
// 							"user id isn't in this workspace, or workspace doesn't exist",
// 						variant: "error",
// 					})
// 				);
// 				return;
// 			}
// 		});
// 	});
// }

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
