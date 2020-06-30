/*
Made by VoidBehemoth with help from BunsenBurn.

Terms:
The term client is used to refer to the Bot User.
The term user is used to refer to the user who sent the message in question.
*/

const Discord = require("discord.js");
const { prefix, commands, secrets, components, types } = require("./config.json");
const { token } = require("./token.json");

const client = new Discord.Client();

// TEMPORARY OBJECT IN PLACE OF DATABASE
var servers = {};

function registerServer(msg) {
    servers[msg.guild.id] = {
        "config": {
            "rating": true,
            "matchmaker": true,
            "min_players": 2,
            "max_players": 2,
            "match_wait": 5
        },
        "users": {},
        "actions": []
    }
}

// Initializes a new user in the database. Not for use outside of accessor functions.
// user: GuildMember, rating: Integer, mult: Integer
function registerUser(msg, user, rating, results = { wins: 0, losses: 0 }) {
    servers[msg.guild.id].users[user] = {
        // Your rating... cannot go beneath 1000.
        "rating": rating,
        // Your match results.
        "results": results
    }
}

function isValidType(type) {
    return (Object.keys(types).find((v) => {
        return v === type;
    }) === type);
};

function isValidOption(type, option) {
    if (!isValidType(type)) return false;

    return (types[type].find((v) => {
        return v === option;
    }) === option);
}

function validateOptions(type, options) {
    if (!isValidType(type)) return false;

    for (let i = 0; i < Object.keys(options).length; i++) {
        if (!isValidOption(type, Object.keys(options)[i])) {
            return false;
        }
    }

    return true;
}

function registerAction(msg, user, type, options) {
    if (servers[msg.guild.id] === undefined) registerServer(msg);
    if (servers[msg.guild.id].users[user] === undefined) registerUser(msg, user, 1000);

    if (!validateOptions(type, options)) {
        msg.channel.send("Encountered an issue registering an action! Please report this to `VoidBehemoth#9503`, `BunsenBurn#6467`, or `RyanMych (Shulk tiem)#0847`.");
        return false;
    }

    servers[msg.guild.id].actions.push({
        "type": type,
        "user": user,
        "options": options
    });

    return true;
}

// accessor function to get rating from user
// user: GuildMember
function getRating(msg, user) {
    // Initializes the user in the database if not already.
    if (servers[msg.guild.id] === undefined) registerServer(msg);
    if (servers[msg.guild.id].users[user] === undefined) registerUser(msg, user, 1000);

    return servers[msg.guild.id].users[user].rating;
}

// accessor function to get number of wins from user
// user: GuildMember
function getWins(msg, user) {
    if (servers[msg.guild.id] === undefined) registerServer(msg);
    // Initializes the user in the database if not already.
    if (servers[msg.guild.id].users[user] === undefined) registerUser(msg, user, 1000);

    return servers[msg.guild.id].users[user].results.wins;
}

// accessor function to get number of losses from user
// user: GuildMember
function getLosses(msg, user) {
    if (servers[msg.guild.id] === undefined) registerServer(msg);
    // Initializes the user in the database if not already.
    if (servers[msg.guild.id].users[user] === undefined) registerUser(msg, user, 1000);

    return servers[msg.guild.id].users[user].results.losses;
}

// Calculates the win-loss ratio of a user
// user: GuildMember
function getWinRate(msg, user, results = false) {
    var a = getWins(msg, user);
    var b = getLosses(msg, user);

    // The Algorithm™
    return 100 * (a / ((a + b === 0) ? 1 : (a + b)));
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
            type: "WATCHING"
        })
        .then(presence => console.log(`Activity set to ${presence.game ? presence.game.name : 'none'}`))
        .catch(console.error);
});

// Called automatically when client receives a message from discord
client.on("message", async msg => {
    // Exits process if the user is a bot, is not in a server, is discord itself, or did not send the message with the designated prefix.
    if (!msg.content.startsWith(prefix) || msg.guild === null || msg.system || msg.author.bot) return;

    // Converts the message to an array.
    const args = msg.content.slice(prefix.length).split(/ +/);
    // Seperates the command itself.
    const command = args.shift().toLowerCase();
    
    // Help command
    if (command === "help" && formatted(msg, args, 0, 1)) {

        const all = (args.length === 0);

        
        
        // Formatting
        msg.channel.send("> :information_source: **<> are mandatory and [] are optional** :information_source:\n");


        if (!all) {
            c = Object.keys(commands).find((v) => {
                return v.startsWith(args[0]);
            });
            s = Object.keys(secrets).find((v) => {
                return v.startsWith(args[0]);
            });

            var isSecret = (s != null && s != undefined);
            var isCommand = (c != null && c != undefined);
            
            if (isCommand || (msg.member.hasPermission("ADMINISTRATOR") && isSecret)) {
                msg.channel.send(`> ${isSecret ? ":cyclone:" : ":globe_with_meridians:"} **${prefix + (isSecret ? s : c)}:** ${isSecret ? "(DEV)" : ""} ${(isSecret) ? secrets[s] : commands[c]}`);
            } else {
                msg.channel.send("Invalid syntax. Try: `~help`.");
            }
            return;
        }

        // Normal commands
        for (const com in commands) {
            msg.channel.send(`> :globe_with_meridians: **${prefix + com}**\n>    ${commands[com]}`);
        }

        // Secret commands
        if (msg.member.hasPermission("ADMINISTRATOR")) {
            for (const com in secrets) {
                msg.channel.send(`> :cyclone: **${prefix + com}:** (DEV)\n>    ${secrets[com]}`);
            } 
        }
    // Rating command
	} else if (command === "rating" && formatted(msg, args, 0, 1)) {
        
        // Gets 'the' mention
        const mentions = msg.mentions.users.first();

        // Whether there is not a mention
        const self = (args.length === 0);

        const rating = getRating(msg, self ? msg.member.user.tag : mentions.tag);

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
            const rating1 = getRating(msg, mentions[0].tag); // The winning player
            const rating2 = getRating(msg, mentions[1].tag); // The losing player

            // Adjusts win and loss counts
            servers[msg.guild.id].users[mentions[0].tag].results.wins += 1;
            servers[msg.guild.id].users[mentions[1].tag].results.losses += 1;
            
            // Calculates 'probability' of both players winning
            const P1 = 1.0 / (1.0 + Math.pow(10, ((rating2 - rating1) / 400))); 
            const P2 = 1.0 / (1.0 + Math.pow(10, ((rating1 - rating2) / 400)));

            // Declares the new™ ratings
            var newRating1; // The winning player
            var newRating2; // The losing player

            // Declares multipliers
            var mult1;
            var mult2;

            // Sets the multipliers
            if (rating1 < 1100) {
                mult1 = 20 + (20 * .012 * (1050 - rating1));
            } else {
                mult1 = 20;
            }
            if (rating2 < 1100) {
                mult2 = 20 - (20 * .012 * (1050 - rating2));
            } else {
                mult2 = 20;
            }

            // Calculates the new ratings
            newRating1 = rating1 + mult1*(1 - P1);
            newRating2 = rating2 + mult2*(0 - P2);

            newRating1 = Number(newRating1.toFixed(2));
            newRating2 = Number(newRating2.toFixed(2));
            
            // Ensures that each player's rating doesn't drop below 1000
            newRating1 = (newRating1 < 1000) ? (newRating1 + (1000 - newRating1)) : newRating1;
            newRating2 = (newRating2 < 1000) ? (newRating2 + (1000 - newRating2)) : newRating2;

            // Updates the rating
            servers[msg.guild.id].users[mentions[0].tag]["rating"] = newRating1;
            servers[msg.guild.id].users[mentions[1].tag]["rating"] = newRating2;

            registerAction(msg, msg.member.user.tag, "match", {
                "winner": {
                    "user": mentions[0].tag,
                    "pre_rating": rating1,
                    "post_rating": newRating1
                },
                "loser": {
                    "user": mentions[1].tag,
                    "pre_rating": rating2,
                    "post_rating": newRating2
                },
            });

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
        const rating = getRating(msg, self ? msg.member.user.tag : mentions.tag);

        // Checks various syntax components
        if ((!self && mentions === undefined) || !Number.isInteger(Number(self ? args[0] : args[1]))) {
            msg.channel.send("Invalid syntax. Try: `~help`.");
            return;
        }

        // Declares and sets the new™ rating
        var newRating = self ? Number(args[0]) : Number(args[1]);

        newRating = Number(newRating.toFixed(2));

        // Ensures that the player's rating doesn't drop below 1000
        newRating = (newRating < 1000) ? (newRating + (1000 - newRating)) : newRating;

        // Updates the rating
        servers[msg.guild.id].users[self ? msg.member.user.tag : mentions.tag].rating = newRating;

        registerAction(msg, msg.member.user.tag, "set", {
            "user": self ? msg.member.user.tag : mentions.tag,
            "pre_rating": rating,
            "post_rating": newRating
        });

        msg.channel.send(`${self ? "Your" : mentions.username + "'s"} rating has been set to ${newRating}`);
    
    // Reset command
    } else if (command === "reset" && formatted(msg, args, 0, 1) && msg.member.hasPermission("ADMINISTRATOR")) {
        // Gets 'the' mention
        const mentions = msg.mentions.users.first();
        // Whether there is not a mention
        const self = (args.length === 0);
        // Whether there is not a mention AND the keyword 'global' is included
        const global = self ? false : (args[0] === "global");

        registerAction(msg, msg.member.user.tag, "reset", {
            "global": global,
            "user": self ? msg.member.user.tag : global ? null : mentions.tag,
            "rating": global ? null : getRating(msg, self ? msg.member.user.tag : mentions.tag),
            "results": global ? null : servers[msg.guild.id].users[self ? msg.member.user.tag : mentions.tag].results
        });

        // Resets the database if global is true
        servers[msg.guild.id].users = global ? {} : servers[msg.guild.id].users;

        // Queries various syntax components
        if ((!self && !global) && (mentions === undefined)) {
            msg.channel.send("Invalid syntax. Try: `~help`.");
            return;
        }

        // Resets a particular user
        servers[msg.guild.id].users[self ? msg.member.user.tag : global ? null : mentions.tag] = undefined;

        // An overly complicated response command that I made because I enjoy simping for the ternary operator
        msg.channel.send(`${self ? "You" : global ? "The database" : mentions.username} ${self ? "have" : "has"} had ${self ? "your" : global ? "all" : "their"} ${global ? "ratings" : "rating"} reset to 1000`);
    // Winrate command
    } else if(command === "winrate" && formatted(msg, args, 0, 1)){
        // Gets 'the' mention
        const mentions = msg.mentions.users.first();

        // Whether there is not a mention
        const self = (args.length === 0);

        const winRate = getWinRate(msg, self ? msg.member.user.tag : mentions.tag);

        // Queries various syntax components
        if (!self && mentions === undefined) {
            msg.channel.send("Invalid syntax. Try: `~help`.");
            return;
        }

        msg.channel.send(`${(self) ? "Your" : mentions.username + "'s"} win rate is ${winRate.toFixed(2)}%`);
   } else if (command === "undo" && formatted(msg, args, 0, 2) && msg.member.hasPermission("ADMINISTRATOR")) {


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

        var updated_users = {};

        // Queries various syntax components
        if (servers[server].actions.length < num) {
            msg.channel.send("Invalid syntax. Try: `~help`.");
            return;
        }

        
        for (let index = 0; index < num; index++) {
            var action = servers[server].actions.pop();
            switch (action.type) {
                case "match":

                    const rating1 = getRating(msg, action.options.winner.user);
                    const rating2 = getRating(msg, action.options.loser.user);

                    const wl1 = getWinRate(msg, action.options.winner.user);
                    const wl2 = getWinRate(msg, action.options.loser.user);

                    if (rating1 != action.options.winner.post_rating || rating2 != action.options.loser.post_rating) {
                        msg.channel.send("Encountered an issue undoing an action! Please report this to `VoidBehemoth#9503`, `BunsenBurn#6467`, or `RyanMych (Shulk tiem)#0847`.")
                        return;
                    }

                    servers[msg.guild.id].users[action.options.winner.user].results.wins -= 1;
                    servers[msg.guild.id].users[action.options.loser.user].results.losses -= 1;

                    servers[msg.guild.id].users[action.options.winner.user].rating = action.options.winner.pre_rating;
                    servers[msg.guild.id].users[action.options.loser.user].rating = action.options.loser.pre_rating;

                    updated_users[action.options.winner.user] = {
                        "old_rating": (updated_users[action.options.winner.user] === undefined) ? rating1 : updated_users[action.options.winner.user].old_rating,
                        "new_rating": action.options.winner.pre_rating,
                        "old_wl": (updated_users[action.options.winner.user] === undefined) ? wl1 : updated_users[action.options.winner.user].old_wl,
                        "new_wl": getWinRate(msg, action.options.winner.user)
                    };

                    updated_users[action.options.loser.user] = {
                        "old_rating": (updated_users[action.options.loser.user] === undefined) ? rating2: updated_users[action.options.loser.user].old_rating,
                        "new_rating": action.options.loser.pre_rating,
                        "old_wl": (updated_users[action.options.loser.user] === undefined) ?  wl2 : updated_users[action.options.loser.user].old_wl,
                        "new_wl": getWinRate(msg, action.options.loser.user)
                    };

                    break;
                case "set":

                    const rating = getRating(msg, action.options.user);
                    const wl = getWinRate(msg, action.options.user);

                    if (rating != action.options.post_rating) {
                        msg.channel.send("Encountered issue B while undoing an action! Please report this to `VoidBehemoth#9503`, `BunsenBurn#6467`, or `RyanMych (Shulk tiem)#0847`.")
                        return;
                    }

                    servers[msg.guild.id].users[action.options.user].rating = action.options.pre_rating;

                    updated_users[action.options.user] = {
                        "old_rating": (updated_users[action.options.user] === undefined) ? rating : updated_users[action.options.user].old_rating,
                        "new_rating": getRating(msg, action.options.user),
                        "old_wl": (updated_users[action.options.user] === undefined) ? wl : updated_users[action.options.user].old_wl,
                        "new_wl": getWinRate(msg, action.options.user)
                    };

                    break;
                case "reset":

                    if (action.options.global) {
                        msg.channel.send("> :x: **Due to storage concerns, it is not possible to undo a global reset.**");
                        return;
                    }

                    if (servers[msg.guild.id].users[action.options.user] != undefined) {
                        msg.channel.send("Encountered an issue undoing an action! Please report this to `VoidBehemoth#9503`, `BunsenBurn#6467`, or `RyanMych (Shulk tiem)#0847`.")
                        return;
                    }

                    registerUser(msg, action.options.user, action.options.rating, action.options.results);

                    updated_users[action.options.user] = {
                        "old_rating": 1000,
                        "new_rating": getRating(msg, action.options.user),
                        "old_wl": 0,
                        "new_wl": getWinRate(msg, action.options.user)
                    };

                    break;
                default:
                    msg.channel.send("Encountered issue A while undoing an action! Please report this to `VoidBehemoth#9503`, `BunsenBurn#6467`, or `RyanMych (Shulk tiem)#0847`.")
                    return;
            }
        }

        var mes = `> :thumbsup: **Done!**\n`;

        for (const u in updated_users) {
            mes = mes + `> \n> \n> :bust_in_silhouette: **${u}**\n> \n> :medal: Rating: **${updated_users[u].old_rating}** –> **${updated_users[u].new_rating}**\n> \n> :fleur_de_lis: Win-Loss Ratio: **${updated_users[u].old_wl}%** –> **${updated_users[u].new_wl}%**\n`;
        }
        
        msg.channel.send(mes);
   }
});

// le token (do not steal)
client.login(token);