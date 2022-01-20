const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const pool = require('../index');

// ratings
router.post('/', jsonParser, addRating);
router.put('/', jsonParser, updateRating);

module.exports = router;


// from here
const addRating = (req, reshttp) => {
    if (!req.body.rating) {
        reshttp.setHeader("Content-Type", "application/json");
		reshttp.status(200);
		reshttp.end(
			JSON.stringify({
				message: "not enough arguments",
				variant: "error",
			})
		);
		return;
    }
    pool.getConnection((err, connection) => {
        if (err) throw err;
        connection.query(`select user_id from users_workspaces where user_id = ${req.body.user_id} and workspace_id = ${req.body.workspace_id}`, (err, res) => {
            if (err) throw err;
            if (res) {
                // connection.query(`select name from coffees where workspace_id = ${req.body.workspace_id}`, (err, res) => {
                //     if (err) throw err;
                //     if (res) {

                //     }
                // })
                connection.query(`
                    select
                    coffees.name as name,
                    coffees.id as coffee_id,
                    ratings.user_id as user_id,
                    ratings.rating as rating,
                    ratings.notes as notes,
                    from coffees
                    where coffees.workspace_id = ${req.body.workspace_id}
                    left join ratings on coffees.id = ratings.coffee_id
                `, (err, res) => {
                    if (err) throw err;
                    if (res) {
                        let coffees = {};
                        let update = false;
                        res.every((item) => {
                            if (!(item.coffee_id in coffees)) {
                                coffees[item.coffee_id] = {
                                    name: item.name,
                                    id: item.coffee_id,
                                    ratings: {}
                                }
                            }
                            if (item.user_id) {
                                coffees[item.coffee_id].rating[item.user_id] = {
                                    rating: item.rating, notes: item.notes
                                }
                            }
                            if (item.user_id === req.body.user_id && item.coffee_id === req.body?.coffee_id) {
                                update = true;
                                return false;
                            }
                            return true;
                        })
                        if (update) {
                            connection.query(`update ratings set rating = ${req.body.rating.rating}, notes = '${req.body.rating.notes}' where user_id = ${req.body.user_id} and coffee_id = ${req.body.coffee_id}`)
                        }
                    }
                })
            }
            reshttp.setHeader("Content-Type", "application/json");
			reshttp.status(200);
			reshttp.end(
				JSON.stringify({
					message: "user isn't in this workspace",
					variant: "error",
				})
			);
			return;
        });
    })
}
// to here, not working

const updateRating = (req, reshttp) => {
    if (!req.body?.rating) {
        reshttp.setHeader("Content-Type", "application/json");
		reshttp.status(200);
		reshttp.end(
			JSON.stringify({
				message: "not enough arguments",
				variant: "error",
			})
		);
		return;
    }
    pool.getConnection((err, connection) => {
        if (err) throw err;
        connection.query(`select rating, notes from ratings where user_id = ${req.body.user_id} and workspace_id = ${req.body.workspace_id} and coffee_id = ${req.body.coffee_id}`, (err, res) => {
            if (err) throw err;
            if (res) {
                if (rating[0].rating !== req.body.rating.rating && res[0].notes !== req.body.rating.notes) {
                    connection.query(`insert into ratings (user_id, workspace_id, coffee_id, rating, notes) values (${req.body.user_id}, ${req.body.workspace_id}, ${req.body.coffee_id}, ${req.body.rating.rating}, '${req.body.rating.notes}')`, (err, res) => {
                        if (err) throw err;
                        reshttp.setHeader("Content-Type", "application/json");
						reshttp.status(200);
						reshttp.end(
							JSON.stringify({
								message: "rating updated or created",
								variant: "success",
							})
						);
						return;
                    })
                }
            }
        })
    })
}