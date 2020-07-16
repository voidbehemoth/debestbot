/*
Made by VoidBehemoth with help from BunsenBurn.

Terms:
The term client is used to refer to the Bot User.
The term user is used to refer to the user who sent the message in question.
*/

const Discord = require("discord.js");

const mongoose = require("mongoose");

const { prefix, commands, secrets, components, types } = require("./config.json");
const { token } = require("./token.json");
const { url } = require("./url.json");
const Server = require("./models/Server.model");

const client = new Discord.Client();

mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('debug', true)

const botdb = mongoose.connection;
botdb.on("error", console.error.bind(console, "connection error:"));
botdb.once("open", function() { console.log("Hacker voice: I'm in") });

async function registerServer(msg) {
    return await Server.create({
        id: msg.guild.id,
        config: {
            "starting_rating": 1000,
            "max_rating": -1,
            "history": true,
            "winrate": true
        },
        users: [],
        actions: []
    }).catch((err) => { console.log(err) });
}

async function getConfig(msg, component = null) {
    var config = (await Server.findOne({id: msg.guild.id})).config;
    return (component === null) ? config : config[component];
}

async function getUsers(msg) {
    var users = (await Server.findOne({id: msg.guild.id})).users;
    return users;
}

async function findUserIndex (msg, user, users) {
    return await users.findIndex((v) => { return (v.tag === user) });
}

async function setUsers(msg, value) {
    var server = await Server.findOne({id: msg.guild.id});

    server.users = value;

    server.save();
}

async function userExists(msg, user) {
    return (await (getUsers(msg)).find((v) => {
        return (user.tag === user);
    }) != undefined);
}

// Initializes a new user in the database. Not for use outside of accessor functions.
// user: GuildMember, rating: Integer, mult: Integer
async function registerUser(msg, user, rating, results = { wins: 0, losses: 0 }) {
    var server = await Server.findOne({id: msg.guild.id});
    var user = {
        tag: user,
        // Your rating... cannot go beneath 1000.
        rating: rating,
        // Your match results.
        results: await getConfig(msg, "winrate") ? results : undefined
    };

    server.users.push(user);
    await server.save();

    return user;
}

async function registerAction(msg, type, user, users, config, alt_params) {
    var server = await Server.findOne({id: msg.guild.id});

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

    return server.actions[len];
}

async function getActions (msg) {
    return (await Server.find({id: msg.guild.id})).actions;
}

async function setConfig(msg, component, value) {
    var server = await Server.find({id: msg.guild.id});
    server.config[component] = value;
    config.save();
}

// accessor function to get rating from user
// user: GuildMember
async function getRating(msg, user) {
    return (await getUsers(msg)).find((v) => { return (user === v.tag) }).rating;
}

// accessor function to get number of wins from user
// user: GuildMember
async function getWins(msg, user) {
    if (!(getConfig(msg, "winrate"))) return null; 
    return (await getUsers(msg)).find((v) => { return (user === v.tag) }).results.wins;
}

// accessor function to get number of losses from user
// user: GuildMember
async function getLosses(msg, user) {
    if (!(getConfig(msg, "winrate"))) return null; 
    return (await getUsers(msg)).find((v) => { return (user === v.tag) }).results.losses;
}

async function getResults(msg, user) {
    if (!(getConfig(msg, "winrate"))) return null; 
    return (await getUsers(msg)).find((v) => { return (user === v.tag) }).results;
}

// Calculates the win-loss ratio of a user
// user: GuildMember
async function getWinRate(msg, user, win, loss) {
    if (!(await getConfig(msg, "winrate"))) return null; 

    var a = (win === undefined) ? (await getWins(msg, user)) : win;
    var b = (loss === undefined) ?  (await getLosses(msg, user)) : loss;

    // The Algorithm™
    return 100 * (a / ((a + b === 0) ? 1 : (a + b)));
}

async function getTopUsers(msg, cat, num) {

    if (cat != "rating" && cat != "winrate") return null;

    const users = await getUsers(msg);

    const topcut = users.sort(async (a, b) => {
        var v1 = (cat === "winrate") ? (await getWinRate(msg, a.tag)) : a.rating;
        var v2 = (cat === "winrate") ? (await getWinRate(msg, b.tag)) : b.rating;

        return v1 - v2;
    });

    if (topcut.length > num) {
        while (topcut.length > num) {
            topcut.pop();
        }
    }

    for (let c = 0; c < topcut.length; c++) {
        if ((topcut[c].results.wins + topcut[c].results.losses) < 5) {
            topcut.splice(c, 1);
            c--;
        } else {
            msg.channel.send(`${Number(c) + 1}. ${topcut[c].tag}: (${cat}) ${(cat === "winrate") ? (await getWinRate(msg, topcut[c].tag)) : (await getRating(msg, topcut[c].tag))}${(cat === "winrate") ? "%" : ""}`);
        }
    }
    console.log(topcut)
}

async function setRating(msg, user, value) {
    var server = await Server.findOne({id: msg.guild.id})

    var index = await findUserIndex(msg, user, server.users);
    console.log(index);

    var new_rating = server.users[index];

    new_rating.rating = value;

    server.users.set(index, new_rating);

    server.save();
}

async function setWins(msg, user, value) {
    if (!(getConfig(msg, "winrate"))) return null; 

    var server = await Server.findOne({id: msg.guild.id})

    var index = await findUserIndex(msg, user, server.users);

    var new_win = server.users[index];

    new_win.results.wins = value;

    server.users.set(index, new_win);

    server.save();
}

async function setLosses(msg, user, value) {
    if (!(getConfig(msg, "winrate"))) return null; 

    var server = await Server.findOne({id: msg.guild.id})

    var index = await findUserIndex(msg, user, server.users);

    var new_loss = server.users[index];

    new_loss.results.losses = value;

    server.users.set(index, new_loss);

    server.save();
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
    client.user.setActivity(`${prefix}help`, { type: 'WATCHING' })
        .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
        .catch(console.error);
});

// Called automatically when client receives a message from discord
client.on("message", async msg => {
    // Exits process if the user is a bot, is not in a server, is discord itself, or did not send the message with the designated prefix.
    if (!msg.content.startsWith(prefix) || msg.guild === null || msg.system || msg.author.bot) return;

    
    if (!(await Server.exists({id: msg.guild.id}))) {
        await registerServer(msg);
    }

    const mentions = msg.mentions.members.array() || new Array();

    mentions.push(msg.member);

    for (user in mentions) {
        if ((await Server.findOne({ id: msg.guild.id })).users.filter((v) => String(v.tag) === String(mentions[user].user.tag)).length < 1) {
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
            
            if (isCommand || (msg.member.hasPermission("ADMINISTRATOR") && isSecret)) {
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
        if (msg.member.hasPermission("ADMINISTRATOR")) {
            for (const com in secrets) {
                if (com != "undo [username & tag] [number of undos to execute]" || getConfig(msg, "history")) {
                    msg.channel.send(`> :cyclone: **${prefix + com}:** (DEV)\n>    ${secrets[com]}`);
                }
            } 
        }
    // Rating command
	} else if (command === "rating" && formatted(msg, args, 0, 1)) {
        
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

        const mentions = msg.mentions.users.first(2);

        if (mentions.length > 1) {

            // Gets rating of mentions
            const rating1 = await getRating(msg, mentions[0].tag); // The winning player
            const rating2 = await getRating(msg, mentions[1].tag); // The losing player

            const res1 = await getResults(msg, mentions[0].tag);
            const res2 = await getResults(msg, mentions[1].tag);

            // Adjusts win and loss counts
            if (getConfig(msg, "winrate")) {
                setWins(msg,mentions[0].tag, ((await getWins(msg, mentions[0].tag)) + 1));
                setLosses(msg,mentions[1].tag, ((await getLosses(msg, mentions[1].tag)) + 1));
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
            if (rating1 < (starting_rating + 100)) {
                mult1 = 20 + (20 * .012 * ((starting_rating + 50) - rating1));
            } else {
                mult1 = 20;
            }
            if (rating2 < (starting_rating + 100)) {
                mult2 = 20 - (20 * .012 * ((starting_rating + 50) - rating2));
            } else {
                mult2 = 20;
            }

            // Calculates the new ratings
            newRating1 = rating1 + mult1*(1 - P1);
            newRating2 = rating2 + mult2*(0 - P2);

            newRating1 = Number(Number(newRating1).toFixed(2));
            newRating2 = Number(Number(newRating2).toFixed(2));
            
            // Ensures that each player's rating doesn't drop below 1000
            newRating1 = (newRating1 < starting_rating) ? starting_rating : newRating1;
            newRating2 = (newRating2 < starting_rating) ? starting_rating : newRating2;
            
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
                await registerAction(msg, "match", msg.member.user.tag, [
                    {
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
    } else if (command === "set" && formatted(msg, args, 1, 2) && msg.member.hasPermission("ADMINISTRATOR")) {
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

        const starting_rating = await getConfig(msg, "starting_rating");

        // Ensures that the player's rating doesn't drop below 1000
        newRating = (newRating < starting_rating) ? starting_rating : newRating;

        var max = await getConfig(msg, "max_rating");

        if (max < 0) max = Infinity;

        newRating = (newRating > max) ? max : newRating;

        // Updates the rating
        await setRating(msg, self ? msg.member.user.tag : mentions.tag, newRating)

        if (await getConfig(msg, "history")) {
            registerAction(msg, "set", msg.member.user.tag, [
                {
                    "user": self ? msg.member.user.tag : mentions.tag,
                    "ratings": {
                        "pre": rating,
                        "post": newRating
                    },
                    "results": {
                        "pre": await getResults(msg, self ? msg.member.user.tag : mentions.tag),
                        "post": await getResults(msg, self ? msg.member.user.tag : mentions.tag)
                    }
                },
            ], [], []);
        }

        msg.channel.send(`${self ? "Your" : mentions.username + "'s"} rating has been set to ${newRating}`);
    
    // Reset command
    } else if (command === "reset" && formatted(msg, args, 0, 1) && msg.member.hasPermission("ADMINISTRATOR")) {
        // Gets 'the' mention
        const mentions = msg.mentions.users.first();
        // Whether there is not a mention
        const self = (args.length === 0);
        // Whether there is not a mention AND the keyword 'global' is included
        const global = self ? false : (args[0] === "global");

        if (await getConfig(msg, "history")) {
            await registerAction(msg, "reset", msg.member.user.tag, global ? [] : [
                {
                    "user": self ? msg.member.user.tag : mentions.tag,
                    "ratings": {
                        "pre": await getRating(msg, self ? msg.member.user.tag : mentions.tag),
                        "post": await getConfig(msg, "starting_rating")
                    },
                    "results": {
                        "pre": await getResults(msg, self ? msg.member.user.tag : mentions.tag),
                        "post": { "wins": 0, "losses": 0}
                    }
                }
            ], [], [
                {
                    "type": "global",
                    "value": global
                }
            ])
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
    } else if(command === "winrate" && formatted(msg, args, 0, 1) && (await getConfig(msg, "winrate"))){
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

        msg.channel.send(`${(self) ? "Your" : mentions.username + "'s"} win rate is ${winrate.toFixed(2)}%`);
    } else if (command === "undo" && formatted(msg, args, 0, 2) && msg.member.hasPermission("ADMINISTRATOR") && (await getConfig(msg, "history"))) {

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
        if ((await Server.findOne({ id: msg.guild.id })).users.length < num) {
            msg.channel.send("Invalid syntax. Try: `~help`.");
            return;
        }

        
        for (let index = 0; index < num; index++) {
            var serv = await Server.findOne({ id: msg.guild.id });
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
                await setLosses(msg, user.user, user.results.pre.wins);
            }

            for (c in action.config) {

                mes = mes + `> \n> \n> :gear: **${action.component}**\n> \n> :wrench: **${action.post}** –> **${action.pre}**\n`

                setConfig(msg, action.config[c].component, action.config[c].value);
            }
        }
        
        msg.channel.send(mes);
   } else if (command === "config" && formatted(msg, args, 0, 2) && msg.member.hasPermission("ADMINISTRATOR")) {

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
                    msg.channel.send(`${comp} has been set to 1000`);
                    break;
                case "max_rating":
                    await setConfig(msg, comp, -1);
                    msg.channel.send(`${comp} has been set to -1`);
                    break;
                case "history":
                    await setConfig(msg, comp, true);
                    msg.channel.send(`${comp} has been set to true`);
                    break;
                case "winrate":
                    await setConfig(msg, comp, true);
                    msg.channel.send(`${comp} has been set to true`);
                    break;
                default:
                    msg.channel.send("Invalid syntax. Try: `~help`.");
                    break;
            }
            return;
        }

        const num = Number(args[1]);
        const bool = (args[1] === "true") ? true : (args[1] === "false") ? false : "not_a_boolean";

        if (!Number.isInteger(num)) {
            if (typeof bool === "boolean") {
                await setConfig(msg, comp, bool);
                msg.channel.send(`${comp} has been set to ${bool}`);
                return;
            }
            msg.channel.send("Invalid syntax. Try: `~help`.");
            return;
        }

        await setConfig(msg, comp, num);

        msg.channel.send(`${comp} has been set to ${num}`);
   } else if (command === "top" && formatted(msg, args, 0, 2)) {
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
   }
});

// le token (do not steal)
client.login(token);