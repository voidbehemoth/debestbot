/*
Made by VoidBehemoth with help from BunsenBurn.

Terms:
The term client is used to refer to the Bot User.
The term user is used to refer to the user who sent the message in question.
*/

const Discord = require("discord.js");

const mongoose = require("mongoose");

const {
    prefix,
    commands,
    secrets,
    components
} = require("./config.json");
const {
    token
} = require("./token.json");
const {
    url
} = require("./url.json");
const Server = require("./models/Server.model");

const client = new Discord.Client();

mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set('debug', false);

const botdb = mongoose.connection;
botdb.on("error", console.error.bind(console, "connection error:"));
botdb.once("open", function () {
    console.log("Hacker voice: I'm in")
});

// Temporary variable to allow others to disable bot
var online = true;

async function registerServer(msg) {
    try {
        return await Server.create({
            id: msg.guild.id,
            config: {
                "starting_rating": 1000,
                "min_rating": 1000,
                "max_rating": -1,
                "history": true,
                "winrate": true,
                "command_channels": []
            },
            users: [],
            actions: []
        });
    } catch (err) {
        console.log(err);
        throw (`Unable to create server with id ${msg.guild.id}!`);
    }
}

async function getConfig(msg, component = null) {
    try {
        return (component === null) ? (await Server.findOne({
            id: msg.guild.id
        })).config : (await Server.findOne({
            id: msg.guild.id
        })).config[component];
    } catch (err) {
        console.log(err);
        throw (`Unable to fetch config${(component === null) ? "" : (" component " + component)}!`);
    }
}

async function getUsers(msg) {
    try {
        return (await Server.findOne({
            id: msg.guild.id
        })).users;
    } catch (err) {
        console.log(err);
        thow("Unable to fetch user list!");
    }
}

async function findUserIndex(msg, user, users) {
    return users.findIndex((v) => {
        return (v.tag === user)
    });
}

async function setUsers(msg, value) {
    try {
        var server = await Server.findOne({
            id: msg.guild.id
        });

        server.users = value;

        await server.save();
    } catch (err) {
        console.log(err);
        thow(`Unable to set user list to ${value}!`);
    }
}

// Initializes a new user in the database. Not for use outside of accessor functions.
// user: GuildMember, rating: Integer, mult: Integer
async function registerUser(msg, user, rating, results = {
    wins: 0,
    losses: 0
}) {
    try {
        var server = await Server.findOne({
            id: msg.guild.id
        });

        server.users.push({
            tag: user,
            // Your rating... cannot go beneath 1000.
            rating: rating,
            // Your match results.
            results: await getConfig(msg, "winrate") ? results : undefined
        });

        await server.save();
    } catch (err) {
        console.log(err);
        throw (`Unable to register user ${user}!`);
    }
}

async function registerAction(msg, type, user, users, config, alt_params) {
    try {
        var server = await Server.findOne({
            id: msg.guild.id
        });

        server.actions.push({
            type: type,
            user: user,
            users: [],
            config: [],
            alt_params: []
        });

        var len = ((server.actions.length - 1) < 0) ? 0 : server.actions.length - 1;
        var new_action = server.actions[len];

        if (users != []) {
            for (u in users) {
                new_action.users.push(users[u]);
            }
        }

        if (config != []) {
            for (c in config) {
                new_action.config.push(config[c]);
            }
        }

        if (alt_params != []) {
            for (a in alt_params) {
                new_action.alt_params.push(alt_params[a]);
            }
        }

        server.actions.set(len, new_action);

        await server.save();
    } catch (err) {
        console.log(err);
        throw (`Unable to register action of type ${type}!`);
    }
}

async function getActions(msg) {
    try {
        return (await Server.find({
            id: msg.guild.id
        })).actions;
    } catch (err) {
        console.log(err);
        throw (`Unable to fetch actions list.`);
    }
}

async function setConfig(msg, component, value) {
    try {
        var server = await Server.find({
            id: msg.guild.id
        });
        server.config[component] = value;
        await server.save();
    } catch (err) {
        console.log(err);
        throw (`Unable to set config component ${component} to ${value}!`)
    }
}

// accessor function to get rating from user
// user: GuildMember
async function getRating(msg, user) {
    try {
        return (await getUsers(msg)).find((v) => {
            return (user === v.tag)
        }).rating;
    } catch (err) {
        console.log(err);
        throw (`Unable to fetch rating of ${user}!`);
    }
}

// accessor function to get number of wins from user
// user: GuildMember
async function getWins(msg, user) {
    try {
        if (!(await getConfig(msg, "winrate"))) return null;
        return (await getUsers(msg)).find((v) => {
            return (user === v.tag)
        }).results.wins;
    } catch (err) {
        console.log(err);
        throw (`Unable to fetch wins of ${user}!`);
    }
}

// accessor function to get number of losses from user
// user: GuildMember
async function getLosses(msg, user) {
    try {
        if (!(await getConfig(msg, "winrate"))) return null;
        return (await getUsers(msg)).find((v) => {
            return (user === v.tag)
        }).results.losses;
    } catch (err) {
        console.log(err);
        throw (`Unable to fetch losses of ${user}!`);
    }
}

async function getResults(msg, user) {
    try {
        if (!(await getConfig(msg, "winrate"))) return null;
        return (await getUsers(msg)).find((v) => {
            return (user === v.tag)
        }).results;
    } catch (err) {
        console.log(err);
        throw (`Unable to fetch results of ${user}!`);
    }
}

// Calculates the win-loss ratio of a user
// user: GuildMember
async function getWinRate(msg, user, win, loss) {
    try {
        if (!(await getConfig(msg, "winrate"))) return null;

        var a = (win === undefined) ? (getWins(msg, user)) : win;
        var b = (loss === undefined) ? (getLosses(msg, user)) : loss;
        var ab = await Promise.all([a, b]);

        // The Algorithm™
        return Number((100 * (ab[0] / ((ab[0] + ab[1] === 0) ? 1 : (ab[0] + ab[1])))).toFixed(2));
    } catch (err) {
        console.log(err);
        throw (`Unable to calculate WL ratio of ${user}!`);
    }
}

function NAgetWinRate(msg, user, win, loss) {
    // The Algorithm™
    return Number((100 * (win / ((win + loss === 0) ? 1 : (win + loss)))).toFixed(2));
}

async function getTopUsers(msg, cat, num) {
    try {
        if (cat != "rating" && cat != "winrate") return null;

        const users = await getUsers(msg);

        const topcut = users;

        topcut.sort((a, b) => {
            var v1 = (cat === "winrate") ? (NAgetWinRate(msg, a.tag, a.results.wins, a.results.losses)) : a.rating;
            var v2 = (cat === "winrate") ? (NAgetWinRate(msg, b.tag, b.results.wins, b.results.losses)) : b.rating;
            
            return v2 - v1;
        });

        for (let c = 0; (c < topcut.length && c < num); c++) {
            if ((topcut[c].results.wins + topcut[c].results.losses) < 3) {
                topcut.splice(c, 1);
                c--;
            } else {
                await msg.channel.send(`${Number(c) + 1}. ${topcut[c].tag}: (${cat}) ${(cat === "winrate") ? (await getWinRate(msg, topcut[c].tag)) : (await getRating(msg, topcut[c].tag))}${(cat === "winrate") ? "%" : ""}`);
            }

            if (topcut.length === 0) {
                msg.channel.send(`> It appears there are no users who meet the criteria for appearing on the top cut.`);
                return;
            }   
        }
    } catch (err) {
        console.log(err);
        throw (`Unable to fetch and post top users!`);
    }
}

async function setRating(msg, user, value) {
    try {
        var server = await Server.findOne({
            id: msg.guild.id
        })

        var index = await findUserIndex(msg, user, server.users);

        var new_rating = server.users[index];

        new_rating.rating = value;

        server.users.set(index, new_rating);

        await server.save();
    } catch (err) {
        console.log(err);
        throw (`Unable to set rating of ${user} to ${value}`);
    }
}

async function setWins(msg, user, value) {
    try {
        if (!(getConfig(msg, "winrate"))) return null;

        var server = await Server.findOne({
            id: msg.guild.id
        })

        var index = await findUserIndex(msg, user, server.users);

        var new_win = server.users[index];

        new_win.results.wins = value;

        server.users.set(index, new_win);

        await server.save();
    } catch (err) {
        console.log(err);
        throw (`Unable to set wins of ${user} to ${value}`);
    }
}

async function setLosses(msg, user, value) {
    try {
        if (!(getConfig(msg, "winrate"))) return null;

        var server = await Server.findOne({
            id: msg.guild.id
        })

        var index = await findUserIndex(msg, user, server.users);

        var new_loss = server.users[index];

        new_loss.results.losses = value;

        server.users.set(index, new_loss);

        await server.save();
    } catch (err) {
        console.log(err);
        throw (`Unable to set losses of ${user} to ${value}`);
    }
}

// Confirms that the required number of arguments are used and alerts the user if otherwise.
// msg: Message, args: an instantiation of the args[] variable, min: int, max: int
function formatted(msg, args, min, max) {
    if (args.length < min) {
        msg.channel.send("Too few arguments!");
        return false;
    } else if (args.length > max) {
        msg.channel.send("Too many arguments!")
    } else {
        return true;
    }
}

// Called automatically when client connects to discord
client.on("ready", () => {
    // Prints to console
    console.log(`Logged in as ${client.user.tag}!`);
    // Sets the activity of the client to prompt the user to use the 'help' command
    client.user.setActivity(`${prefix}help`, {
            type: 'WATCHING'
        })
        .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
        .catch(console.error);
});

// Called automatically when client receives a message from discord
client.on("message", async msg => {
    try {
        if (msg.system || msg.author.bot) return;

        if (msg.guild === null) {
            if (online) {
                if (msg.content.includes("de") || msg.author.tag === "DeRealDeal#0451") {
                    var rand = Math.floor(Math.random() * 10);
                    if (rand === 0) {
                        msg.react("❓");
                    } else if (rand === 1) {
                        msg.channel.send("Why are you doing this to me?");
                    } else if (rand === 2) {
                        msg.channel.send("!!");
                    } else if (rand === 3) {
                        msg.channel.send(":pensive:");
                    } else if (rand === 4) {
                        msg.channel.send(":anger:");
                    } else if (rand === 5) {
                        msg.channel.send("huh");
                    } else if (rand === 6) {
                        msg.channel.send("neat");
                    } else if (rand === 7) {
                        msg.react("🤔");
                    } else if (rand === 8) {
                        msg.react("😳");
                    } else if (rand === 9) {
                        msg.react("🏳️‍🌈");
                    }
                }
            }
            return;
        }

        // Exits process if the user is a bot, is not in a server, is discord itself, or did not send the message with the designated prefix.
        if (!msg.content.startsWith(prefix)) {
            if (online) {
                if (msg.content.startsWith("hi dad i'm")) {
                    const args = msg.content.split(/ +/);
                    if (args.length > 3) {
                        args.shift();
                        args.shift();
                        args.shift();

                        msg.channel.send(`hi ${args.join(" ")} i'm dad`);
                        return;
                    } 
                }
                
            } 
            return; 
        }

        if (!(await Server.exists({
                id: msg.guild.id
            }))) {
            await registerServer(msg);
        }

        var channels = await getConfig(msg, "command_channels");
        if (!(channels.includes(msg.channel.id)) && (channels.length > 0) && !(msg.member.hasPermission("MANAGE_MESSAGES"))) return;

        const mentions = msg.mentions.members.array() || new Array();

        mentions.push(msg.member);

        for (user in mentions) {
            if ((await Server.findOne({
                    id: msg.guild.id
                })).users.filter((v) => String(v.tag) === String(mentions[user].user.tag)).length < 1) {
                var starting_rating = await getConfig(msg, "starting_rating");
                await registerUser(msg, mentions[user].user.tag, starting_rating);
            }
        }

        // Converts the message to an array.
        const args = msg.content.slice(prefix.length).split(/ +/);
        // Seperates the command itself.
        const command = args.shift().toLowerCase();

        // Help command
        if (command === "help" && formatted(msg, args, 0, 1)) {

            if (!online) return;

            const all = (args.length === 0);

            // Formatting
            m = "> :information_source: **<> are mandatory and [] are optional** :information_source:";


            if (!all) {
                var c = Object.keys(commands).find((v) => {
                    return v.startsWith(args[0]);
                });
                var s = Object.keys(secrets).find((v) => {
                    return v.startsWith(args[0]);
                });

                var isSecret = (s != null && s != undefined);
                var isCommand = (c != null && c != undefined);

                if (isCommand || (msg.member.hasPermission("MANAGE_MESSAGES") && isSecret)) {
                    if ((c != "winrate" || getConfig(msg, "winrate")) && (s != "undo" || getConfig(msg, "history"))) {
                        msg.channel.send(m);
                        msg.channel.send(`> ${isSecret ? ":cyclone:" : ":globe_with_meridians:"} **${prefix + (isSecret ? s : c)}:** ${isSecret ? "(DEV)" : ""} ${(isSecret) ? secrets[s] : commands[c]}`);
                    } else {
                        msg.channel.send("Invalid syntax. Try: `~help`.");
                    }
                } else {
                    msg.channel.send("Invalid syntax. Try: `~help`.");
                }
                return;
            }

            msg.channel.send(m);

            // Normal commands
            for (const com in commands) {
                if (com != "winrate [username & tag]" || getConfig(msg, "winrate")) {
                    msg.channel.send(`> :globe_with_meridians: **${prefix + com}**\n>    ${commands[com]}`);
                }
            }

            // Secret commands
            if (msg.member.hasPermission("MANAGE_MESSAGES")) {
                for (const com in secrets) {
                    if (com != "undo [username & tag] [number of undos to execute]" || getConfig(msg, "history")) {
                        msg.channel.send(`> :cyclone: **${prefix + com}:** (DEV)\n>    ${secrets[com]}`);
                    }
                }
            }
            // Rating command
        } else if (command === "rating" && formatted(msg, args, 0, 1)) {

            if (!online) return;

            // Gets 'the' mention
            const mentions = msg.mentions.users.first();

            // Whether there is not a mention
            const self = (args.length === 0);

            const rating = await getRating(msg, self ? msg.member.user.tag : mentions.tag);

            // Queries various syntax components
            if (!self && mentions === undefined) {
                msg.channel.send("Invalid syntax. Try: `~help`.");
                return;
            }

            msg.channel.send(`${(self) ? "Your" : mentions.username + "'s"} rating is ${rating}`);

            // Match command
        } else if (command === "match" && formatted(msg, args, 2, 2)) {

            if (!online) return;

            const mentions = msg.mentions.users.first(2);

            if (mentions.length > 1) {

                // Gets rating of mentions
                const rating1 = await getRating(msg, mentions[0].tag); // The winning player
                const rating2 = await getRating(msg, mentions[1].tag); // The losing player

                const res1 = await getResults(msg, mentions[0].tag);
                const res2 = await getResults(msg, mentions[1].tag);

                // Adjusts win and loss counts
                if (getConfig(msg, "winrate")) {
                    setWins(msg, mentions[0].tag, ((await getWins(msg, mentions[0].tag)) + 1));
                    setLosses(msg, mentions[1].tag, ((await getLosses(msg, mentions[1].tag)) + 1));
                }

                const newRes1 = await getResults(msg, mentions[0].tag);
                const newRes2 = await getResults(msg, mentions[1].tag);

                // Calculates 'probability' of both players winning
                const P1 = 1.0 / (1.0 + Math.pow(10, ((rating2 - rating1) / 400)));
                const P2 = 1.0 / (1.0 + Math.pow(10, ((rating1 - rating2) / 400)));

                // Declares the new™ ratings
                var newRating1; // The winning player
                var newRating2; // The losing player

                // Declares multipliers
                var mult1;
                var mult2;

                const starting_rating = Number(await getConfig(msg, "starting_rating"));

                // Sets the multipliers
                if (rating1 < (starting_rating + 50)) {
                    mult1 = 20 + (20 * .012 * ((starting_rating + 50) - rating1));
                } else {
                    mult1 = 20;
                }
                if (rating2 < (starting_rating + 50)) {
                    mult2 = 20 - (20 * .012 * ((starting_rating + 50) - rating2));
                } else {
                    mult2 = 20;
                }

                // Calculates the new ratings
                newRating1 = rating1 + mult1 * (1 - P1);
                newRating2 = rating2 + mult2 * (0 - P2);

                newRating1 = Number(Number(newRating1).toFixed(2));
                newRating2 = Number(Number(newRating2).toFixed(2));

                var min = await getConfig(msg, "min_rating");

                if (min === -1) min = Number.NEGATIVE_INFINITY;

                // Ensures that each player's rating doesn't drop below 1000
                newRating1 = (newRating1 < min) ? min : newRating1;
                newRating2 = (newRating2 < min) ? min : newRating2;

                var max = Number(await getConfig(msg, "max_rating"));

                if (max < 0) max = Infinity;

                // Ensures that each player's rating doesn't go above the maximum
                newRating1 = (newRating1 > max) ? max : newRating1;
                newRating2 = (newRating2 > max) ? max : newRating2;

                // Updates the rating
                await setRating(msg, mentions[0].tag, newRating1);
                await setRating(msg, mentions[1].tag, newRating2);

                if (await getConfig(msg, "history")) {
                    // msg, type, user, users, config, alt_params
                    await registerAction(msg, "match", msg.member.user.tag, [{
                            "user": mentions[0].tag,
                            "ratings": {
                                "pre": rating1,
                                "post": newRating1
                            },
                            "results": {
                                "pre": res1,
                                "post": newRes1
                            }
                        },
                        {
                            "user": mentions[1].tag,
                            "ratings": {
                                "pre": rating2,
                                "post": newRating2
                            },
                            "results": {
                                "pre": res2,
                                "post": newRes2
                            }
                        }
                    ], [], []);
                }

                msg.channel.send(`> **Match recorded!**\n> ${mentions[0].username} **(winner)**\n> **Old Rating:** ${rating1}\n> New Rating: ${newRating1}\n> ${mentions[1].username} **(loser)**\n> **Old Rating:** ${rating2}\n> New Rating: ${newRating2}`);
            } else {
                msg.channel.send("Not enough mentions. Try: `~help`.");
            }
            // set command
        } else if (command === "set" && formatted(msg, args, 1, 2) && msg.member.hasPermission("MANAGE_MESSAGES")) {

            if (!online) return;

            // Gets 'the' mention
            const mentions = msg.mentions.users.first();

            // Whether there is not a mention
            const self = (args.length === 1);

            // Queries the user in the database to ensure it has a value in it
            const rating = await getRating(msg, self ? msg.member.user.tag : mentions.tag);

            // Checks various syntax components
            if ((!self && mentions === undefined) || !Number.isInteger(Number(self ? args[0] : args[1]))) {
                msg.channel.send("Invalid syntax. Try: `~help`.");
                return;
            }

            // Declares and sets the new™ rating
            var newRating = self ? Number(args[0]) : Number(args[1]);

            newRating = Number(newRating.toFixed(2));

            const min = await getConfig(msg, "min_rating");

            if (min === -1) min = Number.NEGATIVE_INFINITY;

            // Ensures that the player's rating doesn't drop below 1000
            newRating = (newRating < min) ? min : newRating;

            var max = await getConfig(msg, "max_rating");

            if (max < 0) max = Infinity;

            newRating = (newRating > max) ? max : newRating;

            // Updates the rating
            await setRating(msg, self ? msg.member.user.tag : mentions.tag, newRating)

            if (await getConfig(msg, "history")) {
                registerAction(msg, "set", msg.member.user.tag, [{
                    "user": self ? msg.member.user.tag : mentions.tag,
                    "ratings": {
                        "pre": rating,
                        "post": newRating
                    },
                    "results": {
                        "pre": await getResults(msg, self ? msg.member.user.tag : mentions.tag),
                        "post": await getResults(msg, self ? msg.member.user.tag : mentions.tag)
                    }
                }, ], [], []);
            }

            msg.channel.send(`${self ? "Your" : mentions.username + "'s"} rating has been set to ${newRating}`);

            // Reset command
        } else if (command === "reset" && formatted(msg, args, 0, 1) && msg.member.hasPermission("MANAGE_MESSAGES")) {

            if (!online) return;

            // Gets 'the' mention
            const mentions = msg.mentions.users.first();
            // Whether there is not a mention
            const self = (args.length === 0);
            // Whether there is not a mention AND the keyword 'global' is included
            const global = self ? false : (args[0] === "global");

            if (await getConfig(msg, "history")) {
                await registerAction(msg, "reset", msg.member.user.tag, global ? [] : [{
                    "user": self ? msg.member.user.tag : mentions.tag,
                    "ratings": {
                        "pre": await getRating(msg, self ? msg.member.user.tag : mentions.tag),
                        "post": await getConfig(msg, "starting_rating")
                    },
                    "results": {
                        "pre": await getResults(msg, self ? msg.member.user.tag : mentions.tag),
                        "post": {
                            "wins": 0,
                            "losses": 0
                        }
                    }
                }], [], [{
                    "type": "global",
                    "value": global
                }])
            }

            // Resets the database if global is true
            if (global) await setUsers(msg, []);

            // Queries various syntax components
            if ((!self && !global) && (mentions === undefined)) {
                msg.channel.send("Invalid syntax. Try: `~help`.");
                return;
            }

            // Resets a particular user
            if (!(global)) {
                var user = self ? msg.member.user.tag : mentions.tag;
                await setRating(msg, user, await getConfig(msg, "starting_rating"));
                await setWins(msg, user, 0);
                await setLosses(msg, user, 0);
            }

            // An overly complicated response command that I made because I enjoy simping for the ternary operator
            msg.channel.send(`${self ? "You" : global ? "The database" : mentions.username} ${self ? "have" : "has"} had ${self ? "your" : global ? "all" : "their"} ${global ? "ratings" : "rating"} reset to ${await getConfig(msg, "starting_rating")}`);
            // Winrate command
        } else if (command === "winrate" && formatted(msg, args, 0, 1) && (await getConfig(msg, "winrate"))) {

            if (!online) return;

            // Gets 'the' mention
            const mentions = msg.mentions.users.first();

            // Whether there is not a mention
            const self = (args.length === 0);

            // Queries various syntax components
            if (!self && mentions === undefined) {
                msg.channel.send("Invalid syntax. Try: `~help`.");
                return;
            }

            const winrate = await getWinRate(msg, self ? msg.member.user.tag : mentions.tag);

            const games = (await getWins(msg, self ? msg.member.user.tag : mentions.tag)) + (await getLosses(msg, self ? msg.member.user.tag : mentions.tag))

            msg.channel.send(`${(self) ? "Your" : mentions.username + "'s"} win rate is ${winrate.toFixed(2)}% (out of ${games} games).`);
        } else if (command === "undo" && formatted(msg, args, 0, 2) && msg.member.hasPermission("MANAGE_MESSAGES") && (await getConfig(msg, "history"))) {

            if (!online) return;

            // Gets 'the' mention
            const mentions = msg.mentions.users.first();

            // Whether there is not a mention
            const self = (args.length === 0 || ((args.length === 1) ? Number.isInteger(Number(args[0])) : false));

            if (!self && mentions === undefined) {
                msg.channel.send("Invalid syntax. Try: `~help`.");
                return;
            }

            if (!Number.isInteger(Number(self ? (args.length === 1) ? args[0] : 1 : (args.length === 2) ? args[1] : 1))) {
                msg.channel.send("Invalid syntax. Try: `~help`.");
                return;
            }

            const num = Number(self ? (args.length === 1) ? args[0] : 1 : (args.length === 2) ? args[1] : 1);

            const tag = self ? msg.member.user.tag : mentions.tag;
            const server = msg.guild.id;

            var mes = `> :thumbsup: **Done!**\n`;

            // Queries various syntax components
            if ((await Server.findOne({
                    id: msg.guild.id
                })).users.length < num) {
                msg.channel.send("Invalid syntax. Try: `~help`.");
                return;
            }


            for (let index = 0; index < num; index++) {
                var serv = await Server.findOne({
                    id: msg.guild.id
                });
                var action = serv.actions.pop();
                await serv.save();

                for (a in action.alt_params) {
                    switch (action.alt_params[a].type) {
                        case "global":
                            msg.channel.send("> :x: **Due to storage concerns, it is not possible to undo a global reset.**");
                            return;
                        default:
                            break;
                    }
                }

                for (u in action.users) {
                    var user = action.users[u];

                    mes = mes + `> \n> \n> :bust_in_silhouette: **${user.user}**\n> \n> :medal: Rating: **${user.ratings.post}** –> **${user.ratings.pre}**\n> \n> :fleur_de_lis: Win-Loss Ratio: **${await getWinRate(msg, user.user, user.results.post.wins, user.results.post.losses)}%** –> **${await getWinRate(msg, user.user, user.results.pre.wins, user.results.pre.losses)}%**\n`;

                    await setRating(msg, user.user, user.ratings.pre);
                    await setWins(msg, user.user, user.results.pre.wins);
                    await setLosses(msg, user.user, user.results.pre.losses);
                }

                for (c in action.config) {

                    mes = mes + `> \n> \n> :gear: **${action.component}**\n> \n> :wrench: **${action.post}** –> **${action.pre}**\n`

                    setConfig(msg, action.config[c].component, action.config[c].value);
                }
            }

            msg.channel.send(mes);
        } else if (command === "config" && formatted(msg, args, 0, 2) && msg.member.hasPermission("MANAGE_MESSAGES")) {

            if (!online) return;

            if (args.length === 0) {
                for (const comp in components) {
                    msg.channel.send(`> :star: **${comp}**\n>    ${components[comp]}`);
                }
                return;
            }

            var comp = Object.keys(components).find((v) => {
                return v === args[0];
            });

            if (comp === null || comp === undefined) {
                msg.channel.send("Invalid syntax. Try: `~help`.");
                return;
            }

            if (args.length === 1) {
                msg.channel.send(`> :star: **${comp}**\n>    ${components[comp]}`);
                return;
            }

            if (args[1] === "reset") {
                switch (comp) {
                    case "starting_rating":
                        await setConfig(msg, comp, 1000);
                        msg.channel.send(`${comp} has been reset to 1000`);
                        break;
                    case "min_rating":
                        await setConfig(msg, comp, 1000);
                        msg.channel.send(`${comp} has been reset to 1000`);
                        break;
                    case "max_rating":
                        await setConfig(msg, comp, -1);
                        msg.channel.send(`${comp} has been reset to -1`);
                        break;
                    case "history":
                        await setConfig(msg, comp, true);
                        msg.channel.send(`${comp} has been reset to true`);
                        break;
                    case "winrate":
                        await setConfig(msg, comp, true);
                        msg.channel.send(`${comp} has been reset to true`);
                        break;
                    case "command_channels":
                        await setConfig(msg, comp, []);
                        msg.channel.send(`${comp} has been reset to (empty)`)
                        break;
                    default:
                        msg.channel.send("Could not reset that config component. Invalid syntax. Try: `~help`.");
                        break;
                }
                return;
            }

            const num = Number(args[1]);
            const bool = (args[1] === "true") ? true : (args[1] === "false") ? false : "not_a_boolean";

            if (!Number.isInteger(num)) {
                if (typeof bool === "boolean") {
                    if (comp != "history" && comp != "winrate") return;
                    await setConfig(msg, comp, bool);
                    msg.channel.send(`${comp} has been set to ${bool}`);
                    return;
                }
                msg.channel.send("Invalid syntax. Try: `~help`.");
                return;
            }

            if (comp === "command_channels") {
                var serv = await Server.findOne({
                    id: msg.guild.id
                });
                var pos = serv.config.command_channels.indexOf(num);

                if (pos != -1) {
                    serv.config.command_channels.splice(pos, 1);
                    await serv.save();
                    msg.channel.send(`${num} was removed from whitelisted command channels.`);
                    return;
                }
                serv.config.command_channels.push(num);
                await serv.save();
                msg.channel.send(`${num} was added to whitelisted command channels.`);
                return;
            }

            if (comp != "starting_rating" && comp != "min_rating" && comp != "max_rating") return;

            await setConfig(msg, comp, num);

            msg.channel.send(`${comp} has been set to ${num}`);
        } else if (command === "top" && formatted(msg, args, 0, 2)) {

            if (!online) return;            

            if (args.length === 0) {
                await getTopUsers(msg, "rating", 10);
                return;
            }

            if (args.length === 1) {

                const num = Number(args[0]);

                if (Number.isInteger(num) && ((-1 * num) < 0) && Number.isFinite(num)) {
                    await getTopUsers(msg, "rating", num);
                } else if (args[0] === "rating" || args[0] === "winrate") {
                    await getTopUsers(msg, args[0], 10);
                } else {
                    msg.channel.send("Invalid syntax. Try: `~help`.");
                }

                return;

            }

            const num = Number(args[1]);

            if (!(Number.isInteger(num) && ((-1 * num) < 0) && Number.isFinite(num) && (args[0] === "top" || args[0] === "winrate"))) {
                msg.channel.send("Invalid syntax. Try `~help`");
            }

            await getTopUsers(msg, args[0], num);
        } else if (command === "spoof" && formatted(msg, args, 2, Infinity) && msg.member.hasPermission("MANAGE_MESSAGES")) {

            if (!online) return;

            var id = args.shift();
            if (Number.isNaN(Number(id))) {
                id = id.split("");
                id.shift();
                id.shift();
                id.pop();
                id = id.join("");
            }
            const mes = args.join(" ");
            if (msg.guild.channels.cache.get(id) === undefined) return;

            msg.guild.channels.cache.get(id).send(mes);

            msg.channel.send("The following message was sent to `" + msg.guild.channels.cache.get(id).name + "`:\n```" + mes + "```");
        } else if (command === "de" && formatted(msg, args, 0, 0)) {

            if (!online) return;

            msg.channel.send("```\n     _/\\____/\\_\n    <( ō    ō )>\n    /|        |\\ \n   / |   . .  | \\ \n  | _|   __   |_ |\n   \\__\\______/\\__/\n     __| | | |__\n   /____/  \\____\\ \n```");
        } else if (command === "dab" && formatted(msg, args, 0, 0)) {

            if (!online) return;

            msg.channel.send("https://media.discordapp.net/attachments/734579399306772610/734856096409452559/DeDab.gif");
        } else if (command === "floss" && formatted(msg, args, 0, 0)) {

            if (!online) return;

            msg.channel.send("https://images-ext-2.discordapp.net/external/AH3PyscD616GxhTePm8xcbmIE2NjK-gJ6iQsucZAUQQ/https/media.discordapp.net/attachments/734579399306772610/734884722429395044/DeFloss.gif");
        } else if (command === "code" && formatted(msg, args, 0, 0)) {

            if (!online) return;

            msg.channel.send(":sparkles: **The code** :sparkles:: https://github.com/voidbehemoth/debestbot")
        } else if (command === "togglebot" && formatted(msg, args, 0, 0) && msg.member.hasPermission("MANAGE_MESSAGES")) {
            const auth_users = [
                // Shulk
                328173089533853698,
                // Quazar
                264167288066801665,
                // Void
                332344252468035596
            ]

            if (auth_users.includes(Number(msg.member.user.id))) {
                online = !online;
                msg.channel.send(`${msg.member.user.tag} has turned the bot ${(online) ? "online" : "offline"}`);
                console.log(`${msg.member.user.tag} has turned the bot ${(online) ? "online" : "offline"}`);

                client.user.setActivity((online) ? `${prefix}help` : `❌ bot manually offline`, {
                        type: 'WATCHING'
                    })
                    .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
                    .catch(console.error);
            }
        }
    } catch (err) {
        console.log(err);
    }
});

// le token (do not steal)
client.login(token);