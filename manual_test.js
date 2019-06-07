// The Dungeon Maker examples ¯\_(ツ)_/¯
//
// By Grant Scrits
//      (Gmanicus)



// REQUIREMENTS:
//
// CUSTOM EMOJIS

var emojis = {
    ravager: {"name": "ravager", "id": "⚔"},
    chest: {"name": "chest", "id": "⚰"},
    end: {"name": "escape_end", "id": ":escape_end:526268507793653760"},

    west: {"name": "west", "id": "⬅"},
    east: {"name": "east", "id": "➡"},
    north: {"name": "north", "id": "⬆"},
    south: {"name": "south", "id": "⬇"},

    west_door: {"name": "key_left", "id": ":key_left:525541530627342336"},
    east_door: {"name": "key_right", "id": ":key_right:525541530379878412"},
    north_door: {"name": "key_up", "id": ":key_up:525541530543456257"},
    south_door: {"name": "key_down", "id": ":key_down:525541530505838593"},

    west_blocked: {"name": "left_blocked", "id": ":left_blocked:525541530514096138"},
    east_blocked: {"name": "right_blocked", "id": ":right_blocked:522531319360651291"},
    north_blocked: {"name": "up_blocked", "id": ":up_blocked:522531319855448086"},
    south_blocked: {"name": "down_blocked", "id": ":down_blocked:522531318416801802"}
}


var reaction_time = 3

var dir_table = [ // table to compare compass directions to
    "east",
    "west",
    "north",
    "south"
];




const map = require('./dungeonmaker.js');
const map = require('./room_maker.js'); // Handy little library I made for making quick text blips + some

const Discord = require("discord.js");
const bot = new Discord.Client();

var msg_channel;
var main_channel_id = "Your Channel ID here";
var bot_id = "Your Bot ID here";

var seed = 1;



bot.on("ready", () => {
    seed = Date.now();
    msg_channel = bot.channels.get(main_channel_id);
    msg_channel.send("Bot is ready!!!");

});


bot.on("message", async message => {
    if (message.content.toLowerCase() === "!create") {

        map.session()

        map.session.disableAutoStashing()

        map.session.placeCorridor([0, 8], [10, 8])
        map.session.placeCorridor([2, 0], [2, 9])
        map.session.placeCorridor([9, 0], [9, 9])
        map.session.placeCorridor([0, 3], [10, 3])

        map.session.setTileData([2, 3], {stash: "key", status: "unexplored"})

        map.session.setPlayerPos([1, 3])

        var our_session = await map.session.complete()

        msg_channel.send(await map.session.getMapImage(our_session))
        msg_channel.send(await map.session.getMinimapImage(our_session))

        map.session.getMapData(our_session)

        await map.session.update(our_session)
        await map.session.update.leap("east", our_session)

        msg_channel.send(await map.session.getMapImage(our_session))
        msg_channel.send(await map.session.getMinimapImage(our_session))

        await wait(2000)

        await map.session.update(our_session)
        await map.session.update.leap("east", our_session)

        msg_channel.send(await map.session.getMapImage(our_session))
        msg_channel.send(await map.session.getMinimapImage(our_session))

        await wait(2000)

        await map.session.update(our_session)
        await map.session.update.leap("east")

        msg_channel.send(await map.session.getMapImage(our_session))
        msg_channel.send(await map.session.getMinimapImage(our_session))

        await wait(1000)

        map.session.end(our_session)


    }


    if (message.content.toLowerCase() === "!test") {

        var our_session = await map.session("auto")

        await map.session.update(our_session)

        dungeon_embed(room.write_room(await map.session.update.getCurrentTile()), our_session)

    }
});



async function dungeon_embed(data, ses) {
    var add_time = 0


    msg_channel.send(await map.session.getMapImage(ses));

    msg_channel.send(await map.session.getMinimapImage(ses));

    var dungeon = new Discord.RichEmbed()
        .setColor("#e67e22")
        .setTitle(data.dungeon)
        .addField(data.location, data.desc)
        .setFooter("Test embed for room_maker.js")



    if (!(data.ravager == undefined)) {
        dungeon.addField(data.ravager_title, data.ravager)  // Add a field in the embed if there is a ravager on this tile
        add_time++      // We add a second to give players a time to think about what they want to do
    }

    if (!(data.chest == undefined)) {
        dungeon.addField(data.chest_title, data.chest)
        add_time++      // ^
    }

    if (!(data.key == undefined)) {
        dungeon.addField(data.key_title, data.key)
        add_time++      // ^
    }

    if (!(data.crystals == undefined)) {
        dungeon.addField(data.crystals_title, data.crystals)
        add_time++      // ^
    }

    if (!(data.materials == undefined)) {
        dungeon.addField(data.materials_title, data.materials)
        add_time++      // ^
    }

    if (!(data.door == undefined)) {
        dungeon.addField(data.door_title, data.door)
        add_time++      // ^
    }

    if (!(data.end == undefined)) {
        dungeon.addField(data.end_title, data.end)
        add_time++      // ^
    }



    msg = await msg_channel.send({ embed: dungeon })

    var current_pos = map.session.getPlayerPos()
    var dirs = map.session.update.check_borders(current_pos.x, current_pos.y)
    var tile_data =  map.session.update.getCurrentTile()

    react_menu(msg, dirs, tile_data, reaction_time + add_time, ses)    // Create the reaction movement menu
}

async function react_menu(msg, dirs, data, time, our_session) {
    if (!(data === undefined)) {
        if (data.stash == "ravager") {
            await msg.react(emojis.ravager.id);
        }

        if (data.stash == "chest") {
            await msg.react(emojis.chest.id);
        }

        if (data.stash == "end") {
            await msg.react(emojis.end.id);
        }

    }


    if (dirs.includes("west")) {
        await msg.react(emojis.west.id);
    } else if (dirs.includes("west_door")) {
        await msg.react(emojis.west_door.id);
    } else {
        await msg.react(emojis.west_blocked.id);
    }

    if (dirs.includes("east")) {
        await msg.react(emojis.east.id);
    } else if (dirs.includes("east_door")) {
        await msg.react(emojis.east_door.id);
    } else {
        await msg.react(emojis.east_blocked.id);
    }

    if (dirs.includes("north")) {
        await msg.react(emojis.north.id);
    } else if (dirs.includes("north_door")) {
        await msg.react(emojis.north_door.id);
    } else {
        await msg.react(emojis.north_blocked.id);
    }

    if (dirs.includes("south")) {
        await msg.react(emojis.south.id);
    } else if (dirs.includes("south_door")) {
        await msg.react(emojis.south_door.id);
    } else {
        await msg.react(emojis.south_blocked.id);
    }

    player_interact(msg, dirs, data.stash, time, our_session)
}

function player_interact(msg, dirs, tile_stash, time, our_session) {
    setTimeout(async function(){

        msg_channel.send("Vote cast");

        var react_table = []

        // Count Interaction votes

        if (tile_stash.includes("ravager")) {
            try {
                var ravager = await msg.reactions.find(reaction => reaction.emoji.name === emojis.ravager.id).count;
                react_table.push(["ravager", ravager])
            } catch(err) {
                var ravager = 0
            }
        } else {
            var ravager = 0
        }

        if (tile_stash.includes("chest")) {
            try {
                var chest = await msg.reactions.find(reaction => reaction.emoji.name === emojis.chest.id).count;
                react_table.push(["chest", chest])
            } catch(err) {
                var chest = 0
            }
        } else {
            var chest = 0
        }

        if (tile_stash.includes("end")) {
            try {
                var end = await msg.reactions.find(reaction => reaction.emoji.name === emojis.end.name).count;
                react_table.push(["end", end])
            } catch(err) {
                var end = 0
            }
        } else {
            var end = 0
        }


        // Count Movement votes


        if (dirs.includes("north")) {
            try {
                var up = await msg.reactions.find(reaction => reaction.emoji.name === emojis.north.id).count;
                react_table.push(["north", north])
            } catch(err) {
                var up = 0
            }

            var key_up = 0
        } else {
            var up = 0

            if (dirs.includes("north_door")) {
                try {
                    var key_up = await msg.reactions.find(reaction => reaction.emoji.name === emojis.north_door.name).count;
                    react_table.push(["key_up", key_up])
                } catch(err) {
                    var key_up = 0
                    console.log("error with key")
                }
            } else {
                var key_up = 0
            }
        }

        if (dirs.includes("south")) {
            try {
                var down = await msg.reactions.find(reaction => reaction.emoji.name === emojis.south.id).count;
                react_table.push(["down", down])
            } catch(err) {
                var down = 0
            }

            var key_down = 0
        } else {
            var down = 0

            if (dirs.includes("south_door")) {
                try {
                    var key_down = await msg.reactions.find(reaction => reaction.emoji.name === emojis.south_door.name).count;
                    react_table.push(["key_down", key_down])
                } catch(err) {
                    var key_down = 0
                    console.log("error with key")
                }
            } else {
                var key_down = 0
            }
        }

        if (dirs.includes("west")) {
            try {
                var left = await msg.reactions.find(reaction => reaction.emoji.name === emojis.west.id).count;
                react_table.push(["left", left])
            } catch(err) {
                var left = 0
            }

            var key_left = 0
        } else {
            var left = 0

            if (dirs.includes("west_door")) {
                try {
                    var key_left = await msg.reactions.find(reaction => reaction.emoji.name === emojis.west_door.name).count;
                    react_table.push(["key_left", key_left])
                } catch(err) {
                    var key_left = 0
                    console.log("error with key")
                }
            } else {
                var key_left = 0
            }
        }

        if (dirs.includes("east")) {
            try {
                var right = await msg.reactions.find(reaction => reaction.emoji.name === emojis.east.id).count;
                react_table.push(["right", right])
            } catch(err) {
                var right = 0
            }

            var key_right = 0
        } else {
            var right = 0

            if (dirs.includes("east_door")) {
                try {
                    var key_right = await msg.reactions.find(reaction => reaction.emoji.name === emojis.east_door.name).count;
                    react_table.push(["key_right", key_right])
                } catch(err) {
                    var key_right = 0
                    console.log("error with key")
                }
            } else {
                var key_right = 0
            }
        }


        var vote = "none"

        for (x=0; x < react_table.length; x++) {
            var most = true

            for (y=0; y < react_table.length; y++) {
                if (react_table[x][1] <= react_table[y][1] && react_table[y][0] != react_table[x][0]) {
                    console.log("Reaction: %s is lower than %s", react_table[x][0], react_table[y][0])
                    most = false
                    break;
                }
            }

            if (most == true) {
                console.log("Found highest vote: " + react_table[x][0])
                vote = react_table[x][0]
                break;
            }

        }



        if (vote == "left") {

            await map.session.update(our_session)
            await map.session.update.leap("west", our_session)
            dungeon_embed(room.write_room(await map.session.update.getCurrentTile()), our_session)
        } else if (vote == "right") {

            await map.session.update(our_session)
            await map.session.update.leap("east", our_session)
            dungeon_embed(room.write_room(await map.session.update.getCurrentTile()), our_session)
        } else if (vote == "up") {

            await map.session.update(our_session)
            await map.session.update.leap("north", our_session)
            dungeon_embed(room.write_room(await map.session.update.getCurrentTile()), our_session)
        } else if (vote == "down") {

            await map.session.update(our_session)
            await map.session.update.leap("south", our_session)
            dungeon_embed(room.write_room(await map.session.update.getCurrentTile()), our_session)
        } else if (vote == "key_up") {

            msg_channel.send("We opened the door to the north")

            await map.session.update(our_session)
            await map.session.update.leap("north", our_session)
            dungeon_embed(room.write_room(await map.session.update.getCurrentTile()), our_session)
        } else if (vote == "key_down") {

            msg_channel.send("We opened the door to the south")

            await map.session.update(our_session)
            await map.session.update.leap("south", our_session)
            dungeon_embed(room.write_room(await map.session.update.getCurrentTile()), our_session)
        } else if (vote == "key_left") {

            msg_channel.send("We opened the door to the west")

            await map.session.update(our_session)
            await map.session.update.leap("west", our_session)
            dungeon_embed(room.write_room(await map.session.update.getCurrentTile()), our_session)
        } else if (vote == "key_right") {

            msg_channel.send("We opened the door to the east")

            await map.session.update(our_session)
            await map.session.update.leap("east", our_session)
            dungeon_embed(room.write_room(await map.session.update.getCurrentTile()), our_session)
        }  else if (vote == "ravager") {

            msg_channel.send("We fought the ravager!")
        } else if (vote == "chest") {

            msg_channel.send("We opened the chest!")
        } else {

            msg_channel.send("Votes tied")

            await map.session.update(our_session)
            await map.session.update.leap(dirs[random(dirs.length)], our_session)
            dungeon_embed(room.write_room(await map.session.update.getCurrentTile()), our_session)
        }

        console.log("react_table: " + react_table)
        console.log("VOTE: " + vote)



        console.log("Moving... VOTE COUNTS: ")
        console.log("Up: [%s], Down: [%s], Left: [%s], Right: [%s]", up, down, left, right)
        console.log("Key_Up: [%s], Key_Down: [%s], Key_Left: [%s], Key_Right: [%s]", key_up, key_down, key_left, key_right)
        console.log("RAVAGER: " + ravager)
        console.log("CHEST: " + chest)
        console.log("END: " + end)

    }, (time * 1000)) // Wait specified seconds before preparing for next message
}




async function wait(ms) {               // Pauses a function in case we need to wait for things to process. Used in the API
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function random(max) {      // Helpful little random that is based on the global seed variable. Javascript, dissapointingly, doesn't have a randomseed() function.
    var x = Math.sin(seed++) * 10000;                   // This solves that.
    x = x - Math.floor(x)

    if (!(max == undefined)) {
        x = Math.floor(x * max)
    }

    return x;
};











bot.login(bot_id);
