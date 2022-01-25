const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const bcrypt = require("bcrypt");

const pool = require("../index");

// users
router.post("/", jsonParser, addUser);
router.get("/", jsonParser, isUserInWorkspaceReq);
// workspaces
router.get("/workspace", jsonParser, getUserWorkspace);
router.post("/workspace", jsonParser, addUserWorkspace);
router.delete("/workspace", jsonParser, leaveWorkspace);

module.exports = router;

function leaveWorkspace(req, reshttp) {
	const userId = req.query.userId;
	const workspaceId = req.query.workspaceId;

	pool.getConnection((err, connection) => {
		if (err) throw err;
		isUserInWorkspace(userId, workspaceId, connection, (res) => {
			if (res) {
				connection.query(
					`delete from users_workspaces where workspace_id = ${workspaceId} and user_id = ${userId}`,
					(err, res) => {
						if (err) throw err;
						reshttp.setHeader("Content-Type", "application/json");
						reshttp.end(
							JSON.stringify({
								message: "removed",
								variant: "success",
							})
						);
						return;
					}
				);
			} else {
				reshttp.setHeader("Content-Type", "application/json");
				reshttp.end(
					JSON.stringify({
						message: "this user is not in this workspace",
						variant: "warning",
					})
				);
				return;
			}
		});
	});
}

function isUserInWorkspaceReq(req, reshttp) {
	const user_id = parseInt(req.query.user_id);
	const workspace_id = parseInt(req.query.workspace_id);
	pool.getConnection((err, connection) => {
		isUserInWorkspace(user_id, workspace_id, connection, (res) => {
			connection.release();
			// user already exists
			reshttp.setHeader("Content-Type", "application/json");
			reshttp.end(
				JSON.stringify({
					message: "user in workspace",
					is: res,
					variant: "success",
				})
			);
			return;
		});
	});
}

const isUserInWorkspace = (user_id, workspace_id, connection, callback) => {
	connection.query(
		`select user_id from users_workspaces where user_id = ${user_id} and workspace_id = ${workspace_id}`,
		(err, res) => {
			if (err) throw err;
			if (res.length > 0) {
				console.log("res true");
				callback(true);
			} else {
				callback(false);
			}
		}
	);
};

function addUser(req, reshttp) {
	// if (!req.body?.user_id || !req.body?.email || !req.body?.user_name) {
	// 	reshttp.setHeader("Content-Type", "application/json");
	// 	reshttp.end(
	// 		JSON.stringify({
	// 			message: "not enough arguments",
	// 			variant: "success",
	// 		})
	// 	);
	// 	return;
	// }
	const user_id = req.query.user_id;
	const email = req.query.email;
	const name = req.query.name;

	pool.getConnection((err, connection) => {
		if (err) throw err;
		connection.query(
			`select id from users where id = ${user_id}`,
			(err, res) => {
				if (err) throw err;
				if (res.length > 0) {
					connection.release();
					// user already exists
					reshttp.setHeader("Content-Type", "application/json");
					reshttp.end(
						JSON.stringify({
							message: "User logged in",
							variant: "success",
						})
					);
					return;
				}
				connection.query(
					`insert into users (id, email, name) values (${user_id}, '${email}', '${name}')`,
					(err, res) => {
						if (err) throw err;
						connection.release();
						// user already exists
						reshttp.setHeader("Content-Type", "application/json");
						reshttp.end(
							JSON.stringify({
								message: "User added",
								variant: "success",
							})
						);
						return;
					}
				);
			}
		);
	});
}

function getUserWorkspace(req, reshttp) {
	const userId = req.query.userId;
	if (!userId) {
		reshttp.setHeader("Content-Type", "application/json");
		reshttp.end(
			JSON.stringify({
				message: "you need to specify user id",
				variant: "error",
			})
		);
		return;
	}
	pool.getConnection((err, connection) => {
		if (err) throw err;
		connection.query(
			`
			select
			users_workspaces.workspace_id as id,
			workspaces.name as name
			from users_workspaces
			left join workspaces on users_workspaces.workspace_id = workspaces.id
			where users_workspaces.user_id = ${userId}
			`,
			(err, res) => {
				if (err) throw err;
				connection.release();
				// user already exists
				reshttp.setHeader("Content-Type", "application/json");
				reshttp.end(
					JSON.stringify({
						message: "users workspaces",
						workspaces: res.length > 0 ? res : false,
						variant: "success",
					})
				);
				return;
			}
		);
	});
}

function addUserWorkspace(req, reshttp) {
	// if (
	// 	!req.body?.user_id ||
	// 	!req.body?.workspace_id ||
	// 	!req.body?.workspace_secret
	// ) {
	// 	reshttp.setHeader("Content-Type", "application/json");
	// 	reshttp.end(
	// 		JSON.stringify({
	// 			message: "not enough arguments",
	// 			variant: "error",
	// 		})
	// 	);
	// 	return;
	// }
	// const user_id = req.query.user_id;
	// const workspace_id = req.query.workspace_id;
	// const secret = req.query.workspace_secret;
	const user_id = req.body.user_id;
	const workspace_id = req.body.workspace_id;
	const secret = req.body.secret;
	pool.getConnection((err, connection) => {
		if (err) throw err;
		connection.query(
			`select user_id, workspace_id from users_workspaces where user_id = ${user_id} and workspace_id = ${workspace_id}`,
			(err, res) => {
				if (err) throw err;
				console.log(res);
				if (res.length > 0) {
					connection.release();
					reshttp.setHeader("Content-Type", "application/json");
					reshttp.end(
						JSON.stringify({
							message: "User is already in this workspace",
							variant: "warning",
						})
					);
					return;
				}

				connection.query(
					`select id from users where id = ${user_id}`,
					(err, res) => {
						if (err) throw err;
						console.log(res.length > 0);
						if (res.length > 0) {
							connection.query(
								`select id, secret from workspaces where id = ${workspace_id}`,
								(err, res) => {
									// console.log("pro err");
									if (err) throw err;
									if (res.length > 0) {
										if (res[0].secret === secret) {
											connection.query(
												`insert into users_workspaces (user_id, workspace_id) values (${user_id}, ${workspace_id}) `,
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
																"User added to workspace",
															variant: "success",
														})
													);
													return;
												}
											);
										}
									} else {
										connection.release();
										reshttp.setHeader(
											"Content-Type",
											"application/json"
										);
										reshttp.end(
											JSON.stringify({
												message:
													"No workspace with this id",
												variant: "error",
											})
										);
										return;
									}
								}
							);
						} else {
							connection.release();
							return;
						}
					}
				);
			}
		);
		//
	});
}
