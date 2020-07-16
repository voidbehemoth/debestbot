const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const serverSchema = new Schema({
    id: String,
    config: {
        starting_rating: Number,
        max_rating: Number,
        history: Boolean,
        winrate: Boolean
    },
    users: [{ "tag": String, "rating": Number, "results": { "wins": Number, "losses": Number } }],
    actions: [{ "type": String, "user": String, "users": [{ "user": String, "ratings": { "pre": Number, "post": Number }, "results": { "pre": { "wins": Number, "losses": Number }, "post": { "wins": Number, "losses": Number } } }], "config": [{ "component": String, "pre": Schema.Types.Mixed, "post": Schema.Types.Mixed}], "alt_params": [{ "type": String, "value": Schema.Types.Mixed }] }]
}, {
    typeKey: "$type"
});

module.exports = mongoose.model("Server", serverSchema);