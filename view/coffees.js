const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();

const pool = require("../index");

// Coffees
router.get("/", jsonParser, getWorkspaceCoffees);
router.post("/", jsonParser, createCoffee);
router.get("/id", jsonParser, getCoffeeById);
// router.put("/", jsonParser, updateCoffee);

router.get("/names", jsonParser, getWorkspaceCoffeesNames);

module.exports = router;

function createCoffee(req, reshttp) {
	const name = req.body.name;
	const description = req.body.description;
	const image = req.body.image;
	const url = req.body.url;
	const userId = req.body.userId;
	const workspaceId = req.body.workspaceId;


	pool.getConnection((err, connection) => {
		if (err) throw err;
		isUserInWorkspace(userId, workspaceId, connection, (res) => {
			if (res) {
				connection.query(
					`select id from coffees where name = '${name}' and workspace_id = ${workspaceId}`,
					(err, res) => {
						console.log(res);
						if (err) throw err;
						if (res.length === 0) {
							connection.query(
								`insert into coffees (workspace_id, name, description, image, url, current) values (${workspaceId}, '${name}', '${description}', '${image}', '${url}', 0)`,
								(err) => {
									connection.release();
									if (err) throw err;
									reshttp.setHeader(
										"Content-Type",
										"application/json"
									);
									reshttp.status(200);
									reshttp.end(
										JSON.stringify({
											message: "coffee created",
											variant: "success",
										})
									);
									return;
								}
							);
						} else {
							connection.release();
							// coffee with this name already exists in this workspace
							reshttp.setHeader(
								"Content-Type",
								"application/json"
							);
							reshttp.status(200);
							reshttp.end(
								JSON.stringify({
									message: "this coffee already exists",
									variant: "warning",
								})
							);
							return;
						}
					}
				);
			} else {
				connection.release();
				// user is not logged in
				reshttp.setHeader("Content-Type", "application/json");
				reshttp.status(200);
				reshttp.end(
					JSON.stringify({
						message: "user not in workspace",
						variant: "error",
					})
				);
				return;
			}
		});
	});
}

const isUserInWorkspace = (userId, workspaceId, connection, callback) => {
	connection.query(
		`select user_id from users_workspaces where user_id = ${userId} and workspace_id = ${workspaceId}`,
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

function getWorkspaceCoffeesNames(req, reshttp) {
	const userId = req.query.userId;
	const workspaceId = req.query.workspaceId;

	pool.getConnection((err, connection) => {
		if (err) throw err;
		isUserInWorkspace(userId, workspaceId, connection, (res) => {
			if (res) {
				connection.query(`select name from coffees where workspace_id = ${workspaceId}`, (err, res) => {
					connection.release();
					if (err) throw err;
					reshttp.setHeader("Content-Type", "application/json");
					reshttp.status(200);
					reshttp.end(
						JSON.stringify({
							message: "coffeesnames",
							coffees: res.map(coffee => coffee.name),
							variant: "success",
						})
					);
					return;
				})
			} else {
				connection.release();
				reshttp.setHeader("Content-Type", "application/json");
				reshttp.status(200);
				reshttp.end(
					JSON.stringify({
						message: "user not in workspace",
						variant: "error",
					})
				);
				return;
			}
		})
	})
}

function getCoffeeById(req, reshttp) {
	const userId = req.query.userId;
	const workspaceId = req.query.workspaceId;
	const coffeeId = req.query.coffeeId;

	pool.getConnection((err, connection) => {
		isUserInWorkspace(userId, workspaceId, connection, (res) => {
			if (res) {
				connection.query(`
				select
				coffees.name as name,
				coffees.id as id,
				coffees.description as description,
				coffees.image as image,
				coffees.url as url,
				coffees.current as current,
				ratings.user_id as user_id,
				ratings.rating as rating,
				ratings.notes as notes,
				users.name as user_name
				from coffees
				left join ratings on coffees.id = ratings.coffee_id
				left join users on ratings.user_id = users.id
				where coffees.id = ${coffeeId}
				`, (err, res) => {
					if (err) throw err;
					connection.release();
					if (res.length > 0) {
						let coffee = {
							name: res[0].name,
							id: res[0].id,
							description: res[0].description,
							image: res[0].image,
							url: res[0].url,
							ratings: [],
							count: 0,
							sum: 0,
							average: 0
						}
						res.forEach((item) => {
							if (item.user_id) {
								coffee.ratings = [
									...coffee.ratings,
									{
										name: item.user_name,
										userId: item.user_id,
										rating: item.rating,
										notes: item.notes,
									},
								];
								coffee.count++;
								coffee.sum += item.rating;
								coffee.average =
									coffee.sum /
									coffee.count;
							}
						})
					}
					reshttp.setHeader("Content-Type", "application/json");
					reshttp.status(200);
					reshttp.end(
						JSON.stringify({
							message: "coffee",
							variant: "success",
							coffee
						})
					);
					return;
				})
			} else {
				connection.release();
				reshttp.setHeader("Content-Type", "application/json");
				reshttp.status(200);
				reshttp.end(
					JSON.stringify({
						message: "user not in workspace",
						variant: "error",
					})
				);
				return;
			}
		})
	})
}

function getWorkspaceCoffees(req, reshttp) {
	const userId = req.query.userId;
	const workspaceId = req.query.workspaceId;

	pool.getConnection((err, connection) => {
		if (err) throw err;
		isUserInWorkspace(userId, workspaceId, connection, (res) => {
			if (res) {
				connection.query(
					`
                        select
                        coffees.name,
                        coffees.id as id,
                        coffees.description as description,
                        coffees.image as image,
                        coffees.url as url,
                        coffees.current as current,
                        ratings.user_id as user_id,
                       	ratings.rating as rating,
                       	ratings.notes as notes,
                        users.name as user_name
                        from coffees
                		left join ratings on coffees.id = ratings.coffee_id
                        left join users on ratings.user_id = users.id
						where coffees.workspace_id = ${workspaceId}
                        `,
					(err, res) => {
						connection.release();
						if (err) throw err;
						if (res.length > 0) {
							let coffees = {};
							let currentCoffee = 0;
							res.forEach((item) => {
								if (!(item.id in coffees)) {
									coffees[item.id] = {
										name: item.name,
										id: item.id,
										description: item.description,
										image: item.image,
										url: item.url,
										ratings: [],
										count: 0,
										sum: 0,
										average: 0,
									};
								}
								if (item.user_id) {
									coffees[item.id].ratings = [
										...coffees[item.id].ratings,
										{
											name: item.user_name,
											userId: item.user_id,
											rating: item.rating,
											notes: item.notes,
										},
									];
									coffees[item.id].count++;
									coffees[item.id].sum += item.rating;
									coffees[item.id].average =
										coffees[item.id].sum /
										coffees[item.id].count;
								}
								if (item.current) {
									currentCoffee = item.id;
								}
							});
							reshttp.setHeader(
								"Content-Type",
								"application/json"
							);
							reshttp.status(200);
							reshttp.end(
								JSON.stringify({
									coffees: Object.values(coffees),
									coffee: coffees[currentCoffee]
										? coffees[currentCoffee]
										: {},
								})
							);
							return;
						}
						reshttp.setHeader("Content-Type", "application/json");
						reshttp.status(200);
						reshttp.end(
							JSON.stringify({
								message: "there are no coffees",
								variant: "warning",
							})
						);
						return;
					}
				);
			} else {
				connection.release();
				reshttp.setHeader("Content-Type", "application/json");
				reshttp.end(
					JSON.stringify({
						message:
							"user isn't in this workspace, or workspace doesn't exist",
						variant: "error",
					})
				);
				return;
			}
		});
	});
}

// function updateCoffee(req, reshttp) {
// 	const user_id = req.query.user_id;
// 	const workspace_id = req.query.workspace_id;
// 	const secret = req.query.secret;
// 	const edit_key = req.query.edit_key;
// 	const coffee_id = req.query.coffee_id;
// 	const name = req.query.name;
// 	const description = req.query.description;
// 	const image = req.query.image;
// 	const url = req.query.url;

// 	pool.getConnection((err, connection) => {
// 		if (err) throw err;
// 		isUserInWorkspace(user_id, workspace_id, connection, (res) => {
// 			if (res) {
// 				console.log("user exists");
// 				connection.query(
// 					`select secret, edit_key, protect from workspaces where id = ${workspace_id}`,
// 					(err, res) => {
// 						if (err) throw err;
// 						res = res[0];
// 						if (
// 							res.secret === secret &&
// 							((res.protect && res.edit_key === edit_key) ||
// 								!res.protect)
// 						) {
// 							connection.query(
// 								`select name from coffees where name = '${name}' and id <> ${coffee_id} and workspace_id = ${workspace_id}`,
// 								(err, res) => {
// 									if (err) throw err;
// 									if (!(res.length > 0)) {
// 										connection.query(
// 											`update coffees set name = '${name}', description = '${description}', image = '${image}', url = '${url}' where id = ${coffee_id}`,
// 											(err) => {
// 												if (err) throw err;
// 												reshttp.setHeader(
// 													"Content-Type",
// 													"application/json"
// 												);
// 												reshttp.end(
// 													JSON.stringify({
// 														message:
// 															"coffee updated",
// 														variant: "success",
// 													})
// 												);
// 												return;
// 											}
// 										);
// 									} else {
// 										reshttp.setHeader(
// 											"Content-Type",
// 											"application/json"
// 										);
// 										reshttp.end(
// 											JSON.stringify({
// 												message:
// 													"coffee with this name already exists in your workspace",
// 												variant: "warning",
// 											})
// 										);
// 										return;
// 									}
// 								}
// 							);
// 						} else {
// 							reshttp.setHeader(
// 								"Content-Type",
// 								"application/json"
// 							);
// 							reshttp.end(
// 								JSON.stringify({
// 									message: "wrong secrets",
// 									variant: "error",
// 								})
// 							);
// 							return;
// 						}
// 					}
// 				);
// 			} else {
// 				// user isn't in workspace, or workspace, user doesn't exist
// 				reshttp.setHeader("Content-Type", "application/json");
// 				reshttp.end(
// 					JSON.stringify({
// 						message:
// 							"user isn't in this workspace, or workspace doesn't exist",
// 						variant: "error",
// 					})
// 				);
// 				return;
// 			}
// 		});
// 	});
// }
