require("dotenv").config();
const Koa = require("koa");
var mysql = require("mysql");

const RiotAPI = require("teemojs")(process.env.RIOT_GAMES_API_KEY);
const app = new Koa();

var con = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD
});

var totalSummoners;
var cache = [];

con.connect(function(err) {
	if (err) { 
		throw err;
	} else {
		console.log("Connected!");
		var sql = "SELECT discord_tag, sid FROM sql11223201.links";
		con.query(sql, function (err, result) {
			if (err) { 
				throw err;
			} else {
				totalSummoners = result.length;
				console.log("Amount of Registered Summoner: " + totalSummoners);
				setCache(result);
			}
		});
	}
});

function setCache(value) {
	cache = value;
}

app.use(async ctx => {
    if (ctx.query.name) {
        let summoner = await RiotAPI.get("euw1", "summoner.getBySummonerName", ctx.query.name);		
		ctx.body = "<html>" + await test(summoner.accountId) + "</html>";
		//ctx.body = cache[0].sid;
	}
});

var gameId;
var list = "";

async function test(accountId) {
			let recentMatches = await RiotAPI.get("euw1", "match.getRecentMatchlist", accountId);
			
			for(h = recentMatches.startIndex; h < recentMatches.endIndex; h++){
				gameId = recentMatches.matches[h].gameId;
				var sql = "SELECT * FROM sql11223201.matches WHERE match_id = ?";				
				try {
					con.query(sql,[gameId], async function (err, result) {
						if (err) {
							throw err;
						} else {
							var rowAmount = result.length;
							if(rowAmount = 0) {
								let match = await RiotAPI.get("euw1", "match.getMatch", gameId);
								var matchTS = new Date(match.gameCreation);
								var today = new Date();
								
								for(s = 0; s < totalSummoners; s++) {
									if(match.participantIdentities.find(p => p.player.summonerId == cache[s].sid)){
									//	if(1 == 1) { //matchTS.toDateString() == today.toDateString()
											var sql3 = "SELECT sessions, session_received FROM sql11223201.sessions WHERE discord_tag = ?";
											try {
												con.query(sql3,[cache[s].discord_tag], function (err, result) {
													if (err) {
														throw err;
													} else {
														var session_received = result.session_received;
														
														if(session_received == 0) {														
															var sql4 = "UPDATE sql11223201.sessions SET sessions = sessions + 1, session_received = 1 WHERE discord_tag = ?";
															try {	
																con.query(sql4,[cache[s].discord_tag], function (err, result) {
																	if (err) {
																		throw err;
																	} else {
																		list = list + gameId + " - Yes - Session Added<br/>";
																		session_received = 1;
																	}
																})
															} catch (err) {
																console.log(err);
															}
														}
													}
												});
											} catch (err) {
												console.log(err);
											}
									//	} else {
									//		list = list + gameId + " - Yes - Not Today - " + matchTS.toDateString() + "<br/>";
									//	}
									} else {
										list = list + gameId + " - No<br/>";
									}
								}
								
								var sql2 = "INSERT INTO sql11223201.matches (match_id) VALUES ( ? )";
								try {
									con.query(sql2,[gameId], function (err, result) {
										if (err) {
											throw err;
										} else {
											console.log(gameId + " - Added to DB");
										}
									});
								} catch (err) {
									console.log(err);
								}
								
							} else {
								list = list + gameId + " - Already Recorded -<br/>";
								console.log("ALREADY RECORDED");
							}
						}
					});
				} catch (err) {
					console.log(err);
				}
			}
			return list;
}

app.listen(3000);