// The Dungeon Maker
//
// By Grant Scrits
//      (Gmanicus)



// REQUIREMENTS:
//
// CUSTOM EMOJIS




var exports = module.exports = {};

const Discord = require("discord.js");
const bot = new Discord.Client();

const PImage = require('pureimage');
const fs = require('fs');

const room = require('./room_maker')

var msg_channel;
var seed = 1;

var map = [];
var ctx_size = {};
var tile_size = 0;
var spacer = 0

var current_pos = {
    "x": 0,
    "y": 0
}

var dir_table = [ // table to compare compass directions to
    "east",
    "west",
    "north",
    "south"
];

var tile_rgba = {};            // Preset tile colors

tile_rgba.unexplored = [0, 0, 0, 1]
tile_rgba.explored = [90, 100, 130, 1]
tile_rgba.current = [0, 150, 255, 1]
tile_rgba.no_tile = [50, 50, 50, 1]
tile_rgba.door = [255, 190, 0, 1]
tile_rgba.end = [255, 90, 40, 1]

var room_table = ["ravager", "chest"]            // Set room stash tables. Used for picking random items.
var item_table = ["key", "crystals", "materials"]   // Item table. Basically the same as room stashes, but set aside for easy placement inside chest inventories.

var stash_placement = true                      // Should we automatically place stashes?
var end_placement = true                        // Should we place an exit?
var hide_tiles = true                           // Should we hide non-explored tiles?

var map_font = PImage.registerFont('map_font.ttf','FFF Forward');  // Get the FFF Forward font that's included in the directory

// Just a little warning: You'll need to make offset changes in draw_string() if you change the font.
// PImage doesn't allow transparency when pasting a different image into the context, otherwise I would have opted for preset icons instead of text.



// The generation API. Require this script to use it.

exports.session = async function(mode, context, session) {

    // MANUAL DEFAULTS

    seed = Date.now();      // Get the new map seed based on the time at which this function is called

    map = []                // Reset our script's "map" table

    if (!(context == undefined)) {
        tile_size = context.tile_size
        ctx_size = context.ctx_size
    } else {
        ctx_size = {           // Set the image size to be 300x200
            "x": 300,
            "y": 200
        }

        tile_size = 20
    }

    spacer = Math.floor(tile_size / 10)     // Calculate the space between tiles

    stash_placement = true          // Do we want to automatically place stashes?
    var end_placement = true
    var hide_tiles = true



    dungeon = PImage.make(ctx_size.x,ctx_size.y);  // Make image
    ctx = dungeon.getContext('2d');                // Get image context

    ctx.fillStyle = '#000000';               // Select black color
    ctx.fillRect(0,0,ctx_size.x,ctx_size.y); // Fill background

    var our_session = undefined


    // AUTO MODE


    if (mode == "auto") {

        draw_corridor(ctx, [0, 5], "east")         // Draw three staggard corridors (hence no "to" setting)
        draw_corridor(ctx, [4, 0], "south")         // This is the same setup I used since the beginning, and it actually works the best out of
        draw_corridor(ctx, [11, 0], "south")        // what I've seen.


        var leftmost_pos = get_leftmost_pos()

        current_pos.x = leftmost_pos.x
        current_pos.y = leftmost_pos.y

        for (v = 0; v <= map.length-1; v++) {
    
            if (map[v][0] == current_pos.x && map[v][1] == current_pos.y) { // Find the current tile
                map[v][2].status = "current"                                // set the tile's status to "current". Affects tile color, outline and etc.
                break;                          // No need to continue looking.
            }
        }

        our_session = await new_session()

        draw_map(ctx)                           // Draw everything from tile background to corridors to outlines, etc

        setTimeout(function(){                  // We wait half a second to give PImage time to "draw" everything
            PImage.encodePNGToStream(dungeon, fs.createWriteStream('dungeon' + our_session + '.png')).then(() => {     // Now take the image data and convert it into a
                console.log("wrote out the png file to dungeon" + our_session + ".png");                               // PNG file
            }).catch((e)=>{
                console.log("there was an error writing dungeon map");
            });
        }, 500);

        var minimap = draw_minimap()

        setTimeout(async function(){
            PImage.encodePNGToStream(minimap, fs.createWriteStream('minimap' + our_session + '.png')).then(() => {
                console.log("wrote out the png file to minimap" + our_session + ".png");
            }).catch((e)=>{
                console.log("there was an error writing minimap");
            });
        }, 500);

    }


    // MANUAL COMMANDS



    exports.session.disableAutoStashing = function disableAutoStashing() {      // Simple enough, call this function before any placeCorridor calls

        stash_placement = false

    }

    exports.session.disableAutoEnd = function disableAutoEnd() {      // Simple enough, call this function before any placeCorridor calls

        end_placement = false

    }

    exports.session.disableAutoHide = function disableAutoHide() {      // Simple enough, call this function before any placeCorridor calls

        hide_tiles = false

    }

    exports.session.placeCorridor = function placeCorridor(from, to) {            // "to" can be *alternatively* submitted as a compass direction in string format
        draw_corridor(ctx, from, to)         // for staggered placement, at the cost of an accurate stopping point.
                                            // Place tiles on the map. Essential :3
    }

    exports.session.setPlayerPos = function setPlayerPos(pos) {     // Would be best to call this before complete(), unless the map is for show

        if (!(get_tile_data(pos[0], pos[1]))) {                 // Just a simple check to make sure you didn't screw up the position
            warn("On map.gen.setPlayerPos: **[%s, %s] is not on a tile!!!**\nDefaulting to first tile placed.", pos[0], pos[1])

            pos = [map[0][0], map[0][1]]
        }

        current_pos.x = pos[0]
        current_pos.y = pos[1]

        for (v = 0; v <= map.length-1; v++) {           // Find the current tile
    
            if (map[v][0] == current_pos.x && map[v][1] == current_pos.y) { // If that tile is found in the list
                map[v][2].status = "current"            // Set that tile's status as "current". Hmm... hopefully no one calls setPlayerPos twice. I should counter that.
                break;                                  // No need to continue
            }
        }

    }

    exports.session.setEndPos = function setEndPos(pos) {     // Would be best to call this before complete(), unless the map is for show

        if (!(get_tile_data(pos[0], pos[1]))) {                 // Just a simple check to make sure you didn't screw up the position
            warn("On map.gen.setEndPos: **[%s, %s] is not on a tile!!!**\nDefaulting to last tile placed.", pos[0], pos[1])
        }

        for (v = 0; v <= map.length-1; v++) {           // Find the current tile
    
            if (map[v][0] == pos[0] && map[v][1] == pos[1]) { // If that tile is found in the list
                map[v][2].stash = "end"                 // Counter calling multiple times? Allow multiple end points? It's not almost an oversight, it's a feature!
                break;                                  // No need to continue
            }
        }

    }

    exports.session.setTileData = function setTileData(pos, data) {     // In case you wanted to place an item or room in a specific spot.

        if (!(set_tile_data(pos, data))) {              // If we couldn't do that...
            warn("On map.gen.setTileData: **[%s, %s] doesn't have a room!!!**", pos[0], pos[1])     // warn that you messed up :P
        }

    }

    exports.session.complete = async function complete() {        // Complete the map by drawing it and converting it to a file

        our_session = await new_session()

        draw_map(ctx)                       // Draw everything from tile background to corridors to outlines, etc

        setTimeout(function(){              // Wait half a second to give PImage time to "draw" everything
            PImage.encodePNGToStream(dungeon, fs.createWriteStream('dungeon' + our_session + '.png')).then(() => {  // Convert the map into an image file
                console.log("wrote out the png file to dungeon" + our_session + ".png");
            }).catch((e)=>{
                console.log("there was an error writing dungeon map");
            });
        }, 500);

        var minimap = draw_minimap()

        setTimeout(async function(){
            PImage.encodePNGToStream(minimap, fs.createWriteStream('minimap' + our_session + '.png')).then(() => {
                console.log("wrote out the png file to minimap" + our_session + ".png");
            }).catch((e)=>{
                console.log("there was an error writing minimap");
            });
        }, 500);

        return our_session

    }

    exports.session.getPlayerPos = function getPlayerPos() {     // Would be best to call this before complete(), unless the map is for show

        return current_pos

    }

    exports.session.getMapImage = async function getMapImage(ses) {              // Get the image file. Returned in embeddable format to make it easy. You can still grab the info from the object

        console.log("We're trying to find map image via getMapImage")
        console.log("Via SESSION: " + ses.toString())

        var image = await find_session_item("map_image", ses)

        await wait(600) // Wait for image to populate the file. So far this timing has 100% success rate.

        var file = new Discord.Attachment(image);       // Grab the image

        var dungeon_embed = new Discord.RichEmbed()             // Make the rich embed
            .setColor("#e67e22")                                // Give it a "Sanctum" Orange highlight
            .setImage("attachment://" + image)               //  Set the url to the attachment url

        return { files: [file], embed: dungeon_embed, url: "attachment://" + image } // return all the data in an embeddable object

    }

    exports.session.getMinimapImage = async function getMinimapImage(ses) {              // Get the image file. Returned in embeddable format to make it easy. You can still grab the info from the object

        var image = await find_session_item("minimap_image", ses)

        await wait(600)

        var mini = new Discord.Attachment(image);

        var minimap_embed = new Discord.RichEmbed()
            .setColor("#e67e22")
            .setImage("attachment://" + image)

        console.log("Returning Data")

        return { files: [mini], embed: minimap_embed, url: "attachment:" + image }

    }

    exports.session.getMapData = async function getMapData(ses) {        // Get the map data, in case you want to read it.

        map = await find_session_item("map", ses)

        console.log(map_to_text())              // Convert the map into text so that we can print it for quick viewing

        return map                  // return the map

    }

    exports.session.end = async function end(ses) {

        await wait(600)

        delete_session(ses)

    }

    return our_session

}



exports.session.update = async function update(ses) {


    map = await find_session_item("map", ses)
    ctx_size = await find_session_item("ctx_size", ses)
    current_pos = await find_session_item("current_pos", ses)
    tile_size = await find_session_item("tile_size", ses)
    spacer = await find_session_item("spacer", ses)
    stash_placement = await find_session_item("stash_placement", ses)
    end_placement = await find_session_item("end_placement", ses)
    hide_tiles = await find_session_item("hide_tiles", ses)


    exports.session.update.leap = async function leap(direction) {

        console.log("\n\nCOMMENCING LEAP EFFECTS 1/2\n");
        for (z = 0; z <= map.length-1; z++) {   // Sift through positions to find the tile matching current_pos, and change it's status to "exlored"
            var data = map[z]                   // We do this because we're about to move out of this position.

            x = data[0]
            y = data[1]

            console.log("Current position: " + [current_pos.x, current_pos.y] + " | Trying: " + [x, y]);

            if (x == current_pos.x && y == current_pos.y) { // If that tile is found in the list
                console.log("\nExplored tile: " + [x, y]);
                data[2].status = "explored"
                break;
            }
        }

        console.log("LEAP DIRECTION: " + direction)

        if (direction === "north") {
            current_pos.y = current_pos.y - 1
            console.log("Leapt North")
        } else if (direction === "south") {
            current_pos.y = current_pos.y + 1
            console.log("Leapt South")
        } else if (direction === "west") {
            current_pos.x = current_pos.x - 1
            console.log("Leapt West")
        } else if (direction === "east") {
            current_pos.x = current_pos.x + 1
            console.log("Leapt East")
        }

        console.log("\n\nCOMMENCING LEAP EFFECTS 2/2\n");
        for (v = 0; v <= map.length-1; v++) {       // Sift through map to find tile matching current_pos, and change it's status to "current"
            var data = map[v]

            x = data[0]
            y = data[1]

            console.log("Current position: " + [current_pos.x, current_pos.y] + " | Trying: " + [x, y]);

            if (x == current_pos.x && y == current_pos.y) { // If that tile is found in the list
                console.log("\nFOUND CURRENT TILE : " + [x, y] + "\n");
                data[2].status = "current"
                break;
            }
        }

        redraw = PImage.make(ctx_size.x,ctx_size.y);        // Redraw with the tile updates (current_pos change and explored tiles, etc)
        new_ctx = redraw.getContext('2d');

        new_ctx.fillStyle = '#000000'; // Fill background black
        new_ctx.fillRect(0,0,ctx_size.x,ctx_size.y);

        draw_map(new_ctx, ctx_size)

        setTimeout(function(){
            PImage.encodePNGToStream(redraw, fs.createWriteStream('dungeon' + ses + '.png')).then(() => {
                console.log("wrote out the png file to dungeon.png");
            }).catch((e)=>{
                console.log("there was an error writing dungeon map");
            });
        }, 500);



        var minimap = draw_minimap()

        setTimeout(async function(){
            PImage.encodePNGToStream(minimap, fs.createWriteStream('minimap' + ses + '.png')).then(() => {
                console.log("wrote out the png file to minimap.png");
            }).catch((e)=>{
                console.log("there was an error writing minimap");
            });

        }, 500);

        await delete_session(ses, true)
        await update_session(ses)
    }



    exports.session.update.check_borders = function check_borders(x, y) {
        return check_boarders(x, y)
    }

    exports.session.update.getCurrentTile = function getCurrentTile() {
        var data = undefined
        
        for (z = 0; z <= map.length-1; z++) {
            var local_data = map[z]
        
            if (local_data[0] == current_pos.x && local_data[1] == current_pos.y) { // If that tile is found in the list
                data = local_data[2]
                break;
            }
        }
        
        return data
    }
}




bot.on("ready", () => {
    msg_channel = bot.channels.get("513586692150525952"); 
    msg_channel.send("Bot is ready!!!");

});


bot.on("message", async message => {
    if (message.content.toLowerCase() === "!gen") {

        seed = Date.now();

        map = []

        ctx_size = {
            "x": 300,
            "y": 200
        }

        tile_size = 20
        spacer = Math.floor(tile_size / 10)

        var tile_maxes = {
            "x": Math.floor(ctx_size.x / tile_size),
            "y": Math.floor(ctx_size.y / tile_size)
        }

        var dungeon = PImage.make(ctx_size.x,ctx_size.y);
        var ctx = dungeon.getContext('2d');

        ctx.fillStyle = '#000000'; // Fill background black
        ctx.fillRect(0,0,ctx_size.x,ctx_size.y);

        draw_corridor(ctx, [4, 0], "south")
        draw_corridor(ctx, [11, 0], "south")
        draw_corridor(ctx, [0, 5], "east")


        // SEPERATE THIS INTO "INIT" FUNCTION

        var leftmost_pos = get_leftmost_pos()

        current_pos.x = leftmost_pos.x
        current_pos.y = leftmost_pos.y

        console.log("\n\n");

        for (v = 0; v <= map.length-1; v++) {
            //console.log("Position listed: " + [map[v][0], map[v][1]]);
            //console.log("Current position: " + [current_pos.x, current_pos.y] + " | Trying: " + [map[v][0], map[v][1]]);
    
            if (map[v][0] == current_pos.x && map[v][1] == current_pos.y) { // If that tile is found in the list
                console.log("\nFOUND CURRENT TILE : " + map[v] + "\n");
                map[v][2].status = "current"
                break;
            }
        }

        draw_map(ctx)

        var minimap = draw_minimap()

        setTimeout(function(){
            PImage.encodePNGToStream(dungeon, fs.createWriteStream('dungeon.png')).then(() => {
                console.log("wrote out the png file to dungeon.png");
            }).catch((e)=>{
                console.log("there was an error writing dungeon map");
            });

            msg_channel.send("K, your position is: [" + current_pos.x + ", " + current_pos.y + "]");
        }, 500);

        setTimeout(async function(){
            var file = new Discord.Attachment('dungeon.png');

            var dungeon_embed = new Discord.RichEmbed()
                .setColor("#e67e22")
                .setImage("attachment://dungeon.png")
            await msg_channel.send({ files: [file], embed: dungeon_embed });
        }, 600);



        setTimeout(function(){
            PImage.encodePNGToStream(minimap, fs.createWriteStream('minimap.png')).then(() => {
                console.log("wrote out the png file to minimap.png");
            }).catch((e)=>{
                console.log("there was an error writing minimap");
            });

            msg_channel.send("MINIMAP Drawn");
        }, 600);

        setTimeout(async function(){
            var file = new Discord.Attachment('minimap.png');

            var dungeon_embed = new Discord.RichEmbed()
                .setColor("#e67e22")
                .setImage("attachment://minimap.png")
            await msg_channel.send({ files: [file], embed: dungeon_embed });
        }, 700);

        console.log(map_to_text())

    } else if (message.content.toLowerCase() === "!test") {

        dungeon_embed(room.write_room(get_tile_data(current_pos.x, current_pos.y)))
    }

});









// ****** ****** ****** ****** ****** ****** ****** ****** ****** ******
// -- -- -- -- -- -- -- -- --  DRAW  -- -- -- -- -- -- -- -- -- -- --
// ****** ****** ****** ****** ****** ****** ****** ****** ****** ******





function draw_corridor(ctx, pos, bias) {    // (Image, Position, Where to?)
    var x = 0

    var step = pos

    if (typeof(bias) == "object") {     // If it's an object, it's a position
                                        // If it's a position, we need to draw a straight line there
        var x_dif = bias[0] - pos[0]
        var y_dif = bias[1] - pos[1]    // Calculate x and y differences

        var zig = []                    // I call it the "zig-zag" table. It contains the step numbers for when we should turn for one tile in order to get there

        if (x_dif > y_dif) {            // If it's farther across the screen than it is up or down


            var total_steps = Math.abs(x_dif) + Math.abs(y_dif)     // Calculate the total steps by just adding the two differences together

            var zag_pos = Math.abs(Math.floor(total_steps / y_dif)) // Get the zag position by seeing where we need to turn in order to get there

            for (y = 1; y <= Math.abs(y_dif); y++) {                // Make a for loop to add turns, as long as we haven't turned too many times

                console.log("Zig_step: " + (y * (zag_pos)))
                console.log("# of prev zags: " + (y - 1))
                console.log("Zig_step CORRECTED: " + ((y * (zag_pos)) - (y - 1)))

                var zig_step = y * zag_pos                          // Simply multiply this turn by the turn number to get where the next turn should be

                zig.push(zig_step)                                  // Push it to the zig-zag table

            }

            console.log("\nX_DIF IS HIGHER. Planning zig-zag positions NORTH SOUTH.")
            console.log("X_dif: " + x_dif)
            console.log("Y_dif: " + y_dif)
            console.log("\n'Zag' positions: " + zig)
            console.log("\nTotal steps: " + total_steps + "\n")

        } else if (y_dif > x_dif) {     // A repeat of what was done before, but in the case of up or down more than across the screen

            var total_steps = Math.abs(y_dif) + Math.abs(x_dif)

            var zag_pos = Math.abs(Math.floor(total_steps / x_dif))

            for (z = 1; z <= Math.abs(x_dif); z++) {

                console.log("Zig_step: " + (z * (zag_pos)))
                console.log("# of prev zags: " + (z - 1))
                console.log("Zig_step CORRECTED: " + ((z * (zag_pos)) - (z - 1)))

                var zig_step = z * zag_pos

                zig.push(zig_step)

            }

            console.log("\nY_DIF IS HIGHER. Planning zig-zag positions WEST EAST.")
            console.log("X_dif: " + x_dif)
            console.log("Y_dif: " + y_dif)
            console.log("\n'Zag' positions: " + zig)
            console.log("\nTotal steps: " + total_steps + "\n")

        }
    }

    if (typeof(bias) == "string") {     // If the bias is a compass direction
        while (true) {                  // Loop until we are satisfied
            x++

            var tile = "none"           // Declare the tile variable

            var dir = bias;             // Which way are we going? "Biased" towards the bias direction, because it resets every loop.

            if (random() > 0.6) { // Holds towards bias direction, but there is a 40% chance it will change to create a "staggered" effect
                dir = dir_table[random(dir_table.length)]

            }

            var results = {};           // declare the results object, so that we can place tile checks inside and run them through if statements

            if (x != 1) {
                if (dir == "east") {
                    results = check_tile(step[0]+1, step[1])        // Run a check to see if the eastern tile has hit another tile or
                                                                    // the edge of the map

                    if (results.no) {       // results -> Not Occupied?
                        tile = [step[0]+1, step[1]]
                    } else if (results.boarder && bias == dir) {     // Yes, I know, I misspelled "border". Meh.
                                                    // If this tile is in the direction of our bias, and it's a border...
                        // Shut down building this corridor. We've reached... ~ the other side ~
                        tile = "none"
                        break;
                    } else if (results.boarder) {       // If it's just a border... "**BUILD A BIGGER ONE**" - Ahem...
                        // Do nothing. Try to aim away from border next time.
                        tile = "none"
                    } else {        // If it's occupied, but not a border...
                        tile = "none"
                        step[0] = step[0] + 1   // Skip it
                    }
                } else if (dir == "west") {         // Aaaaannnd, repeat
                    results = check_tile(step[0]-1, step[1])

                    if (results.no) {
                        tile = [step[0]-1, step[1]]
                    } else if (results.boarder && bias == dir) {
                        // Shut down building this corridor. We've reached the other side.
                        tile = "none"
                        break;
                    } else if (results.boarder) {
                        // Do nothing. Try to aim away from boarder next time.
                        tile = "none"
                    } else {
                        tile = "none"
                        step[0] = step[0] - 1
                    }
                } else if (dir == "north") {
                    results = check_tile(step[0], step[1]-1)

                    if (results.no) {
                        tile = [step[0], step[1]-1]
                    } else if (results.boarder && bias == dir) {
                        // Shut down building this corridor. We've reached the other side.
                        tile = "none"
                        break;
                    } else if (results.boarder) {
                        // Do nothing. Try to aim away from boarder next time.
                        tile = "none"
                    } else {
                        tile = "none"
                        step[1] = step[1] - 1
                    }
                } else if (dir == "south") {
                    results = check_tile(step[0], step[1]+1)

                    if (results.no) {
                        tile = [step[0], step[1]+1]
                    } else if (results.boarder && bias == dir) {
                        // Shut down building this corridor. We've reached the other side.
                        tile = "none"
                        break;
                    } else if (results.boarder) {
                        // Do nothing. Try to aim away from boarder next time.
                        tile = "none"
                    } else {
                        tile = "none"
                        step[1] = step[1] + 1
                    }
                }
            } else {
                tile = step // If it's the first tile, don't move.
            }

            if (tile != "none") { // If this tile has nothing on it
                step = [tile[0], tile[1]] // walk to that tile
                console.log("TILE PLACED AT: [" + tile[0] + ", " + tile[1] + "]")


                tile[2] = {}        // Tile's data is declared as an empty object
                tile[2].status = "unexplored"   // Tile's status is default set to "unexplored"
                tile[2].stash = "none"          // set to empty stash

                if (!(stash_placement == false)) {  // If we're allowed to place stashes and rooms automatically. Lol != false? Did I mean TRUE!?
                    if (Math.random() > 0.9) {      // 10% chance to place a random item
                        tile[2].stash = item_table[random(item_table.length)]

                    } else if (Math.random() > 0.8) {   // %20 percent chance to place a room
                        tile[2].stash = room_table[random(room_table.length)]

                        if (tile[2].stash == "chest") { // If that item is a chest+
                            if (Math.random() > 0.5) {  // %50 percent chance that it will be something else
                                tile[2].stash = item_table[random(item_table.length)]
                            }
                        }
                    }

                    if (count_room("door") > count_item("key")) {
                        tile[2].stash = "key"
                    } else if (random() > 0.95) { // %5 chance that we will place a door
                        tile[2].status = "door"
                    }
                }

                map.push(tile)              // Push the tile info to the map

                draw_square(ctx, tile, tile_size - spacer - 2, tile_rgba.unexplored, "floor");  // Draw the square into the context
            } else {
                console.log("TILE ALREADY PLACED AT: [" + step[0] + ", " + step[1] + "]")
            }
        }
    } else if (typeof(bias) == "object") {      // If the bias is a position

        var def_dir = {}
        var zig_dir = {}

        if (x_dif > y_dif) { // If x_difference is more, the default direction is towards the left or right

            if (x_dif > 0) {
                def_dir = {
                    "x": +1,
                    "y": 0
                }
            } else {
                def_dir = {
                    "x": -1,
                    "y": 0
                }
            }

            if (y_dif > 0) { // If the smaller difference is positive, set the zig as such.
                zig_dir = {
                    "x": 0,
                    "y": +1
                }
            } else {
                zig_dir = {     // If the smaller difference is negative, set the zig as such.
                    "x": 0,
                    "y": -1
                }
            }

        } else if (y_dif > x_dif) { // If y_difference is more, the default direction is towards the up or down

            if (y_dif > 0) {
                def_dir = {
                    "x": 0,
                    "y": +1
                }
            } else {
                def_dir = {
                    "x": 0,
                    "y": -1
                }
            }

            if (x_dif > 0) { // If the smaller difference is positive, set the zig as such.
                zig_dir = {
                    "x": +1,
                    "y": 0
                }
            } else {
                zig_dir = { // If the smaller difference is negative, set the zig as such.
                    "x": -1,
                    "y": 0
                }
            }

        }

        while(true) {   // Loop until broken
            x++     // Set our step

            if (x != 1) {   // If not step 1
                var step_dir = def_dir  // Set default to the direction of the bigger difference (across / up or down)

                for (w = 0; w < zig.length; w++) {  // Check out zig-zag table

                    if (zig[w] == x) {      // Is this step a turn position?

                        step_dir = zig_dir  // Turn so that we can meet at the final position
                        console.log("Zig-zagging")
                        console.log("Zigs: " + zig)

                    }

                }
            } else {    // If it IS step 1
                var step_dir = {    // Stay here
                    "x": 0,
                    "y": 0
                }
            }



            results = check_tile(step[0]+step_dir.x, step[1]+step_dir.y)    // Make sure we aren't stepping on any toes like before

            if (results.no) {
                tile = [step[0]+step_dir.x, step[1]+step_dir.y]
            } else if (results.boarder && bias == dir) {
                // Shut down building this corridor. We've reached the other side.
                tile = "none"
                break;
            } else if (results.boarder) {
                // Do nothing. Try to aim away from boarder next time.
                tile = "none"
            } else {
                tile = "none"
                step = [step[0]+step_dir.x, step[1]+step_dir.y]
            }

            if (tile != "none") { // If we have an open tile
                step = [tile[0], tile[1]] // walk to that tile
                console.log("TILE PLACED AT: [" + tile[0] + ", " + tile[1] + "]")


                tile[2] = {}                    // Repeat of the "string" object's last if statement
                tile[2].status = "unexplored"
                tile[2].stash = "none"

                if (!(stash_placement == false)) {
                    if (random() > 0.9) {
                        tile[2].stash = item_table[random(item_table.length)]

                    } else if (random() > 0.8) {
                        tile[2].stash = room_table[random(room_table.length)]

                        if (tile[2].stash == "chest") {
                            if (Math.random() > 0.5) {
                                tile[2].stash = item_table[Math.floor(Math.random() * item_table.length)]
                            }
                        }
                    }

                    if (count_room("door") > count_item("key")) { // Make sure we have a key for every door
                        tile[2].stash = "key"
                    } else if (random() > 0.95) { // %5 chance that we will place a door, if we're not placing a key
                        tile[2].status = "door"
                    }
                }

                map.push(tile)

                draw_square(ctx, tile, tile_size - spacer - 2, tile_rgba.unexplored, "floor");
            } else {
                console.log("TILE ALREADY PLACED AT: [" + step[0] + ", " + step[1] + "]")
            }

            if (tile[0] == bias[0] && tile[1] == bias[1]) {     // If we have arrived at our destination
                break;          // Stop the loop, we're done here
            }

            if (x > 150) {       // Don't want to freeze up the system if something goes wrong, right?
                console.log("\n\nWELP, WE KEPT GOING.")
                console.log("Something went wrong.\n\n")
                break;
            }

        }
            
    }
}

function draw_square(canvas, pos, size, color, shade_style) {   // (Image ctx, Where?, How big?, What color?, Box or Floor shading?)
    var actual_pos = [pos[0]*tile_size, pos[1]*tile_size]   // Actual pixel position
    var adjust = tile_size - size           // How small should we draw within this tile?

    if (adjust != 0) {          // Devide by two to account for both sides
        adjust = adjust / 2
    }

    if (actual_pos[0] === NaN) {    // If pos[0] = 0 for instance... I think? Wait... This solves a problem, I know it...
        actual_pos[0] = 0
    }

    if (actual_pos[1] === NaN) {
        actual_pos[1] = 0
    }

    canvas.fillStyle = "rgba(" + color[0] + ", " + color[1] + ", " + color[2] + ", " + color[3] + ")";  // Set the "marker" color to the color arg
    canvas.fillRect(actual_pos[0]+adjust, actual_pos[1]+adjust, size, size);                    // Make a box with the "marker"

    if (shade_style) {
        shade_square(canvas, actual_pos, size, color, shade_style)  // If we're shading this tile, push all the data to shade_square()
    }
}

function shade_square(canvas, pos, size, rgba, style) {     // (Image ctx, Where?, How big?, What color?, Box or Floor shading?)
    var y = 0
    var adjust = tile_size - size       // Adjustment to account for spacer

    if (adjust != 0) {      // Account for both sides
        adjust = adjust / 2
    }

    var color = [rgba[0], rgba[1], rgba[2], rgba[3]]    // Separate into local variable, because we can't change argments? <- Had some trouble with it, so I just said screw it.

    if (color[0] > color[1] && color[0] > color[2]) {              // This entire block decides which color is the brightest
        var change = Math.floor(color[0] / Math.floor(size))       // "Change" is how much the color will change by per line
    } else if (color[1] > color[0] && color[1] > color[2]) {
        var change = Math.floor(color[1] / Math.floor(size))
    } else {
        var change = Math.floor(color[2] / Math.floor(size))
    };

    if (style === "box") {          // If we're shading it "pyramid" style
        for (i = Math.floor(size/4); i > 0; i--) {  // I is set to be 1/4th of the square size
            var x = size - i                    // x is to say, "start 'i' distance from the edge of the tile, and work your way out"
            y++

            color[0] = color[0] - change        // Darken the colors
            color[1] = color[1] - change
            color[2] = color[2] - change

            // Check to see if any colors are negative and adjust them, if they are, to prevent the "candy-cane" effect.
            if (color[0] <= 0) {    // Comment these out for some reaaaally... odly tasty looking color combos (If using "box" style shading)
                color[0] = 0
            }
            if (color[1] <= 0) {
                color[1] = 0
            }
            if (color[2] <= 0) {
                color[2] = 0
            }
            // draw a darker, one-line square
            canvas.strokeStyle = "rgba(" + color[0] + ", " + color[1] + ", " + color[2] + ", " + color[3] + ")";    // You get how this works by now
            canvas.strokeRect(pos[0]+i-1+adjust, pos[1]+i-1+adjust, x-i+1, x-i+1);      // Create a one-lined rectangle that adjusts according to where this shade line should be
            // Account for bottom right square, which doesn't get filled by the stroke for some reason
            canvas.fillStyle = "rgba(" + color[0] + ", " + color[1] + ", " + color[2] + ", " + color[3] + ")";
            canvas.fillRect(pos[0]+x+adjust, pos[1]+x+adjust, 1, 1);
        }
    } else if (style === "floor") {     // If we're using the usual 3D shading look
        var floor_pos = pos[1] + (size - Math.floor(size / 5)) + adjust     // Get the floor position of this square
        var floor_size = Math.floor(size / 5)               // Get the size of the floor

        color[0] = color[0] - change * 4        // Since we're just shading once, it needs to be much darker
        color[1] = color[1] - change * 4
        color[2] = color[2] - change * 4

        if (color[0] <= 0) {        // Candy cane effect can be had if this is commented out when using "floor" shading with dark enough R,G, or B.
            color[0] = 0
        }
        if (color[1] <= 0) {
             color[1] = 0
        }
        if (color[2] <= 0) {
            color[2] = 0
        }

        canvas.fillStyle = "rgba(" + color[0] + ", " + color[1] + ", " + color[2] + ", " + color[3] + ")";  //   We've been through this.
        canvas.fillRect(pos[0]+adjust, floor_pos, size, floor_size);
    }
}

function outline_tiles(canvas, this_map) {
    var x = 0
    var y = 0

    for (z = 0; z < this_map.length; z++) {      // Loop through each tile and outline it according to it's status
        var data = this_map[z]

        x = data[0] * tile_size
        y = data[1] * tile_size

        if (data[2].status == "unexplored" || data[2].status == "door") {
            draw_outline(canvas, [x, y], "dotted")      // Self explanatory?
        } else {
            draw_outline(canvas, [x, y], "solid")
        }
    };
}

function draw_outline(canvas, pos, style) {
    var max = tile_size - spacer
    var ol = 0

    offset = Math.floor(spacer / 2)

    // TEST DOT, MARK SQUARE ORIGIN POINT
    //

    //canvas.fillStyle = "rgba(255, 0, 0, 1)";

    //canvas.fillRect(pos[0], pos[1], 1, 1);

    //
    // REMOVE ME LATER

    canvas.fillStyle = "rgba(255, 255, 255, 1)";        // Tried other colors, but a white outline worked best
    canvas.strokeStyle = "rgba(255, 255, 255, 1)";

    if (style === "dotted") {       // Uses an algorithm to draw dots around the edge, creating an outline
        for (xy = 0; ol < max; xy++) {      // ol is basically a step, max is how many steps we can take
            canvas.fillRect(pos[0]+ol+offset, pos[1]+offset, 1, 1);     // Draw across the top of the square
            canvas.fillRect(pos[0]+offset, pos[1]+ol+offset, 1, 1);     // Draw across the left of the square

            canvas.fillRect(pos[0]+max-ol-1+offset, pos[1]+max-1+offset, 1, 1); // Draw across the bottom of the square
            canvas.fillRect(pos[0]+max-1+offset, pos[1]+max-ol-1+offset, 1, 1); // Draw across the right of the square

            ol++

            if (ol < max) {                                 // If we haven't hit the max, draw a second time (Looks nicer: [ -- (space) -- (space) -- ] )
                canvas.fillRect(pos[0]+ol+offset, pos[1]+offset, 1, 1);
                canvas.fillRect(pos[0]+offset, pos[1]+ol+offset, 1, 1);

                canvas.fillRect(pos[0]+max-ol-1+offset, pos[1]+max-1+offset, 1, 1);
                canvas.fillRect(pos[0]+max-1+offset, pos[1]+max-ol-1+offset, 1, 1);
            }

            ol++        // Skip a spot for the space
            ol++
        }
    } else if (style === "solid") {     // Solid is much easier to work with. It's just a rectangle!
        canvas.strokeRect(pos[0]+offset, pos[1]+offset, max-1, max-1);
        
        // And fill lower right corner, which doesn't get filled in stroke for some reason

        canvas.fillRect(pos[0]+offset+max-1, pos[1]+offset+max-1, 1, 1);
    }
}

function draw_string(canvas, pos, string, color) {
    var offset = {};
    var add_space = false

    if (string.includes(" ")) {     // Sub it out for offset calculation
        string = string.substring(1)
        add_space = true
    }

    if (string.length > 1) {        // This is VEERY hacky. I'd prefer not to do this, but again, PImage doesn't work with pasting transparent images.
        offset.x = Math.floor(tile_size / (3.7 + (.8 * string.length)))
    } else {
        offset.x = Math.floor(tile_size / 3.7)
    }
    offset.y = Math.floor(tile_size / 1.25)         // I feel sorry if you have to edit these values to use your own font :[

    if (add_space == true) {
        string = " " + string
    }

    var font_size = "0"

    if (string.length > 1) {
        font_size = (tile_size / (2 + (.06 * string.length))).toString()        // OOF, more calculations
    } else {
        font_size = (tile_size / 2).toString()
    }

    map_font.load(() => {
        canvas.fillStyle = "rgba" + color;
        canvas.font = (tile_size / (2 + (.06 * string.length))).toString() + "pt 'FFF Forward'";    // How big should the font be on this tile?
        canvas.fillText(string, (pos[0] * tile_size) + offset.x, (pos[1] * tile_size) + offset.y);  // I'm sooo sorry...
    });
}

function tile_canvas(canvas, bounds) {      // This function draws the gray tile "background". If you have no placeCorridor calls, this is what you will see.
    var max_x = Math.floor(bounds.x / tile_size)    // Get max tile pos
    var max_y = Math.floor(bounds.y / tile_size)

    for (x = 0; x < max_x; x++) {       // Draw a row
        draw_square(canvas, [x, 0], tile_size - spacer, tile_rgba.no_tile, "floor");

        for (y = 0; y < max_y; y++) {   // In each position in that row, draw a column below it.
            draw_square(canvas, [x, y], tile_size - spacer, tile_rgba.no_tile, "floor");
        }
    }
}

function draw_interactables(canvas, this_map) {
    for (z = 0; z <= this_map.length-1; z++) {
        var data = this_map[z]

        x = data[0]
        y = data[1]

        if (data[2].status === "unexplored" && hide_tiles != true) {      // Lets use our handy dandy, hacky packy draw_string()

            if (data[2].stash === "ravager") {      // Default colors of what you will see if you are not on this tile
                draw_string(canvas, [x, y], " !", "(220, 0, 50, 1)")

            } else if (data[2].stash.includes("chest")) {
                draw_string(canvas, [x, y], "O", "(60, 200, 50, 1)")

            } else if (item_table.includes(data[2].stash)) {    // If there's an object from the item_table on this tile
                draw_string(canvas, [x, y], "~", "(60, 200, 50, 1)")
            }
        } else if (data[2].status === "current") {

            if (data[2].stash === "ravager") {
                draw_string(canvas, [x, y], " !", "(255, 90, 40, 1)")

            } else if (data[2].stash.includes("chest")) {
                draw_string(canvas, [x, y], "O", "(250, 200, 10, 1)")

            } else if (item_table.includes(data[2].stash)) {    // If there's an object from the item_table on this tile
                draw_string(canvas, [x, y], "~", "(250, 200, 10, 1)")
            }
        }
    }
}

function draw_map(canvas) {     // Woot, we're done? Draw everything onto the context
    // Draw background, layer 1

    tile_canvas(canvas, ctx_size)

    var local_size = tile_size - spacer - 2

    // Draw tile "statuses", layer 2

    for (z = 0; z <= map.length-1; z++) {   // Cycle through each position and draw the tiles with different colors according to what their "status" is
        var data = map[z]

        var local_pos = [data[0], data[1]]

        if (end_placement == true) {
            if (z+1 == map.length) {
                map[z][2].stash = "end"         // If this is the last tile, mark it as "end"
            }
        }

        if (data[2].status === "unexplored") {
            draw_square(canvas, local_pos, local_size, tile_rgba.unexplored, "floor");

        } else if (data[2].status === "explored") {
            draw_square(canvas, local_pos, local_size, tile_rgba.explored, "floor");

        } else if (data[2].status === "current") {
            draw_square(canvas, local_pos, local_size, tile_rgba.current, "floor");
        } 

        if (data[2].status === "door" && tile_borders([data[0], data[1]], [current_pos.x, current_pos.y])) {
            draw_square(canvas, local_pos, local_size, tile_rgba.door, "box");
        } else if (data[2].status === "door") {
            draw_square(canvas, local_pos, local_size, tile_rgba.unexplored, "floor");
        }

        if (!(hide_tiles) || data[2].status == "current") {

            if (data[2].stash === "end") {
                shade_square(canvas, [local_pos[0] * tile_size, local_pos[1] * tile_size], Math.floor(local_size / 1.5), tile_rgba.end, "box");
            }
        } else if (data[2].stash === "end" && data[2].status != "door") {
            draw_square(canvas, local_pos, local_size, tile_rgba.unexplored, "floor");
        }
    }

    // Draw tile outlines, layer 3

    outline_tiles(canvas, map)

    draw_interactables(canvas, map)

    console.log("\n\nMAP DRAWN\n\n")
}



function draw_minimap() {        // Woot, we're done? Draw everything onto the context

    var minimap = []

    var new_ctx_size = {
        "x": tile_size * 3,
        "y": tile_size * 3
    }

    var mini_image = PImage.make(new_ctx_size.x,new_ctx_size.y);  // Make image
    var mini_ctx = mini_image.getContext('2d');                // Get image context

    mini_ctx.fillStyle = '#000000';               // Select black color
    mini_ctx.fillRect(0,0,new_ctx_size.x,new_ctx_size.y); // Fill background

    // Draw background, layer 1

    tile_canvas(mini_ctx, new_ctx_size)

    var local_size = tile_size - spacer - 2

    // Draw tile "statuses", layer 2

    for (z = 0; z <= map.length-1; z++) {   // Cycle through each position and draw the tiles with different colors according to what their "status" is

        let data = JSON.parse(JSON.stringify(map[z]));

        var local_pos = [data[0], data[1]]

        console.log("Tile data: " + data)



        var x_dif = local_pos[0] - current_pos.x
        var y_dif = local_pos[1] - current_pos.y

        var minimap_pos = []
        var this_tile = []

        if (x_dif > -2 && x_dif < 2) {
            if (y_dif > -2 && y_dif < 2) {

                this_tile = data
            
                minimap_pos = [x_dif+1, y_dif+1]

                this_tile[0] = minimap_pos[0]; this_tile[1] = minimap_pos[1]

                minimap.push(this_tile)



                if (data[2].status === "unexplored") {
                    draw_square(mini_ctx, minimap_pos, local_size, tile_rgba.unexplored, "floor");
        
                } else if (data[2].status === "explored") {
                    draw_square(mini_ctx, minimap_pos, local_size, tile_rgba.explored, "floor");
        
                } else if (data[2].status === "current") {
                    draw_square(mini_ctx, minimap_pos, local_size, tile_rgba.current, "floor");
                }
        
                if (data[2].status === "door") {
                    draw_square(mini_ctx, minimap_pos, local_size, tile_rgba.door, "box");
                }

                if (data[2].stash === "end") {
                    if (!(hide_tiles) || data[2].status == "current") {
                        shade_square(mini_ctx, [minimap_pos[0] * tile_size, minimap_pos[1] * tile_size], Math.floor(local_size / 1.5), tile_rgba.end, "box");
                    } else if (data[2].status != "door") {
                        draw_square(mini_ctx, minimap_pos, local_size, tile_rgba.unexplored, "floor");
                    }
                }

            }
        }
    }

    // Draw tile outlines, layer 3

    outline_tiles(mini_ctx, minimap)

    draw_interactables(mini_ctx, minimap)

    console.log("\n\nMINIMAP DRAWN\n\n")

    return mini_image
}




function map_to_text() {        // Turns the map into text... yeah... I didn't need to comment this, did I?

    var max_x = Math.floor(ctx_size.x / tile_size)
    var max_y = Math.floor(ctx_size.y / tile_size)

    var text_map = []

    for (y=0; y <= max_y; y++) {        // Basically, get max X and Y and fill the text rows with "█"

        text_map[y] = "█".repeat(max_x) // For each position in this column, draw a row of these things

    }

    for (mtt=0; mtt <= map.length-1; mtt++) {   // Now we're going to sub out the string at the tile positions
                                // and exchange the "█" with a character according to what's on it.

        var beg = text_map[map[mtt][1]].substring(0, map[mtt][0])   // Sub out the first part of the string
        var end = text_map[map[mtt][1]].substring(map[mtt][0]+1)    // Sub out the part of the string after the character we're taking out

        if (map[mtt][2].status == "current") {      // If statements to decide what that subbed out character will be now
            text_map[map[mtt][1]] = beg + "O" + end
        } else if (map[mtt][2].stash == "ravager") {
            text_map[map[mtt][1]] = beg + "!" + end
        } else if (map[mtt][2].stash == "chest") {
            text_map[map[mtt][1]] = beg + "*" + end
        } else if (item_table.includes(map[mtt][2].stash)) {
            text_map[map[mtt][1]] = beg + "~" + end
        } else if (map[mtt][2].status == "explored") {
            text_map[map[mtt][1]] = beg + "-" + end
        } else if (map[mtt][2].status == "unexplored") {
            text_map[map[mtt][1]] = beg + "_" + end
        } else if (map[mtt][2].status == "door") {
            text_map[map[mtt][1]] = beg + "#" + end
        }

    }

    var text = ""

    for (z=0; z <= text_map.length-1; z++) {    // Assemble the table into a readable string

        text = text + text_map[z] + "\n"

    }

    return text

}





// ****** ****** ****** ****** ****** ****** ****** ****** ****** ******
// -- -- -- -- -- -- -- --  CHECKS AND BALANCES  -- -- -- -- -- -- -- --
// ****** ****** ****** ****** ****** ****** ****** ****** ****** ******






function get_boarder_tile(pos) {        // Deprecated
    var dirs = [];
    var dir = "east"
    var tile = "none"

    dirs = check_boarders(pos[0], pos[1])

    if (dirs.length > 0) {
        dir = dirs[Math.random(dirs.length-1)]

        if (dir === "north") {
            tile = [pos[0], pos[1]-1]
        } else if (dir === "south") {
            tile = [pos[0], pos[1]+1]
        } else if (dir === "east") {
            tile = [pos[0]+1, pos[1]]
        } else if (dir === "west") {
            tile = [pos[0]-1, pos[1]-1]
        }
    } else {
        tile = "none"
    }

    if (tile[0] < 0 || tile[1] < 0) { // if the tile is out of bounds
        tile = "none"
    }

    return tile
}

function check_tile(x, y) {
    var not_occupied = true
    var boarder = false
    var door = false

    var tile_pos_max = {
        "x": (x + 1) * tile_size - spacer,
        "y": (y + 1) * tile_size - spacer
    };

    var tile_pos_min = {
        "x": x * tile_size,
        "y": y * tile_size
    };


    if (tile_pos_max.x > ctx_size.x || tile_pos_min.x < 0) {        // If this tile is past the image boundaries
        not_occupied = false
        boarder = true
    } else if (tile_pos_max.y > ctx_size.y || tile_pos_min.y < 0) { // If this tile is past the image boundaries
        not_occupied = false
        boarder = true
    }


    if (boarder == false) {     // Why waste time doing this if we don't need to?
        for (z = 0; z <= map.length-1; z++) {
            if (map[z][0] == x && map[z][1] == y) { // If we find this position has a tile

                not_occupied = false    // It's occupied. Double negative. "It's not, not occupied". Did this to reduce if statement clutter.

                if (map[z][2].status == "door") {   // Is this tile a door?

                    door = true

                }

                break;
            }
        }
    }

    return {
        "no": not_occupied,
        "boarder": boarder,
        "door": door
    }

}

function check_boarders(x, y) {
    var dirs = [];
    var results = {};

    results.north = check_tile(x, y-1)
    results.south = check_tile(x, y+1)
    results.west = check_tile(x-1, y)
    results.east = check_tile(x+1, y)

    if (results.north.no == false && results.north.boarder == false) { // NORTH -- If there is a tile to the North, and it's not past the image boarders
        if (results.north.door) {   // If there is a door to the North
            dirs.push("north_door")
        } else {                    // If not
            dirs.push("north")
        }
    } 
    if (results.south.no == false && results.south.boarder == false) { // SOUTH
        if (results.south.door) {
            dirs.push("south_door")
        } else {
            dirs.push("south")
        }
    } 
    if (results.west.no == false && results.west.boarder == false) { // WEST
        if (results.west.door) {
            dirs.push("west_door")
        } else {
            dirs.push("west")
        }
    } 
    if (results.east.no == false && results.east.boarder == false) { // EAST
        if (results.east.door) {
            dirs.push("east_door")
        } else {
            dirs.push("east")
        }
    }

    return dirs
}

function get_tile_data(x, y, input_map) {       // Sift through map tiles, see if x and y match, if so: return the data on that tile (stash and status)
    var data = undefined

    var this_map = map

    if (!(input_map == undefined)) {
        this_map = input_map
    }

    for (z = 0; z <= this_map.length-1; z++) {
        var local_data = this_map[z]

        if (local_data[0] == x && local_data[1] == y) { // If that tile is found in the list
            data = local_data[2]
            break;
        }
    }

    return data
}

function set_tile_data(pos, value) {        // If x and y match, set tile data to value (stash and status)
    var found = false

    for (z = 0; z <= map.length-1; z++) {
        var local_data = map[z]

        if (local_data[0] == pos[0] && local_data[1] == pos[1]) { // If that tile is found in the list
            map[z][2] = value
            found = true
            break;
        }
    }

    return found
}



function get_leftmost_pos() {
    var best_value = {"x": 10, "y": 10}

    for (x=0; x < map.length-1; x++) {

        var pos = [map[x][0], map[x][1]]

        if (pos[0] < best_value.x) {
            best_value.x = pos[0]
            best_value.y = pos[1]
        }

    }

    return best_value
}


function tile_borders(our_pos, test_pos) {
    var x_dif = Math.abs(our_pos[0] - test_pos[0])
    var y_dif = Math.abs(our_pos[1] - test_pos[1])

    var tf = false

    if (x_dif < 2 && y_dif < 2) {

        tf = true

    }

    return tf

}

function count_item(name) {
    var found = 0

    for (x=0; x < map.length-1; x++) {
        if (map[x][2].stash == name) {
            found++
        }
    }

    return found

}

function count_room(name) {
    var found = 0

    for (x=0; x < map.length-1; x++) {
        if (map[x][2].status == name) {
            found++
        }
    }

    return found

}



// ****** ****** ****** ****** ****** ****** ****** ****** ****** ******
// -- -- -- -- -- -- -- -- -- -- -- SYSTEM  -- -- -- -- -- -- -- -- --
// ****** ****** ****** ****** ****** ****** ****** ****** ****** ******




async function new_session() {

    var data_string = ""

    function compile_line(variable, name) {
        data_string = data_string + "\n" + name + " = " + JSON.stringify(variable)

        if (name != "ctx") {
            console.log("\nCompiled line in session: '" + name + " = " + JSON.stringify(variable) + "'")
        }
    }

    await fs.exists("sessions.txt", async function (exists) {
        if (exists) {
        } else {
            await fs.writeFile("sessions.txt", {flag: 'wx'}, function (err, data)
            {})
        }
    });



    var contents = fs.readFileSync('sessions.txt', 'utf8');
    var total_sessions = contents.split('<session').length - 1



    var data_string = ""

    data_string = data_string + "<session" + total_sessions.toString()

    compile_line(map, "map")
    compile_line(ctx, "ctx")
    compile_line("dungeon" + total_sessions.toString() + ".png", "map_image")
    compile_line("minimap" + total_sessions.toString() + ".png", "minimap_image")
    compile_line(ctx_size, "ctx_size")
    compile_line(tile_size, "tile_size")
    compile_line(spacer, "spacer")
    compile_line(stash_placement, "stash_placement")
    compile_line(end_placement, "end_placement")
    compile_line(hide_tiles, "hide_tiles")
    compile_line(current_pos, "current_pos")

    data_string = data_string + "\n>"

    await fs.appendFile('sessions.txt', data_string, function (err) {
    if (err) throw err;
    });

    console.log("\nCREATED A NEW SESSION")
    console.log("NEW SESSION: " + total_sessions.toString() + "\n")

    return total_sessions
};

async function update_session(ses) {

    var data_string = ""

    function compile_line(variable, name) {
        data_string = data_string + "\n" + name + " = " + JSON.stringify(variable)
    }



    var data_string = ""

    data_string = data_string + "<session" + ses.toString()

    compile_line(map, "map")
    compile_line(ctx, "ctx")
    compile_line("dungeon" + ses.toString() + ".png", "map_image")
    compile_line("minimap" + ses.toString() + ".png", "minimap_image")
    compile_line(ctx_size, "ctx_size")
    compile_line(tile_size, "tile_size")
    compile_line(spacer, "spacer")
    compile_line(stash_placement, "stash_placement")
    compile_line(end_placement, "end_placement")
    compile_line(hide_tiles, "hide_tiles")
    compile_line(current_pos, "current_pos")

    data_string = data_string + "\n>"

    await fs.appendFile('sessions.txt', data_string, function (err) {
    if (err) throw err;
    });

    await wait(500)

    console.log("\nUPDATED SESSION: " + ses.toString() + "\n")
};

async function find_session_item(item, ses) {

    await wait(250)

    var contents = fs.readFileSync('sessions.txt', 'utf8');

    var value_pos = contents.indexOf("<session" + ses.toString())
    value_pos = contents.indexOf(item, value_pos)
    value_pos = contents.indexOf("=", value_pos)

    var last_value_pos = contents.indexOf("\n", value_pos)

    var variable_con = contents.substring(value_pos+1, last_value_pos)

    //console.log("Trying to find: " + item)
    //console.log("value: " + variable_con)
    //console.log("value type: " + (typeof variable_con))
    //console.log("value parsed: " + JSON.parse(variable_con))

    var test = JSON.parse(variable_con) // Urg... had so much trouble getting this working. This side said string, the other side said object. Turns out it was an await issue

    return test
}

function delete_session(ses, list_only) {

    if (!(list_only)) {
        fs.unlinkSync("dungeon" + ses.toString() + ".png")
        fs.unlinkSync("minimap" + ses.toString() + ".png")
    }

    var contents = fs.readFileSync('sessions.txt', 'utf8');

    var value_pos = contents.indexOf("<session" + ses.toString())

    var last_value_pos = contents.indexOf(">", value_pos)

    var replace = contents.substring(value_pos, last_value_pos+1)

    contents = contents.replace(replace, " ")

    fs.writeFileSync("sessions.txt", contents, "utf8")

}










// ****** ****** ****** ****** ****** ****** ****** ****** ****** ******
// -- -- -- -- -- -- -- --  EMBED TEST SYSTEM  -- -- -- -- -- -- -- --
// ****** ****** ****** ****** ****** ****** ****** ****** ****** ******



// JUST A TEST FUNCTION FOR THE ROOM_MAKER -> MAP GEN -> MOVEMENT COLLAB SYSTEM (RMM SYSTEM) ¯\_(ツ)_/¯
// TAKE ME APART ME LATER

// ⬆ ⬇ ⬅ ➡





// ****** ****** ****** ****** ****** ****** ****** ****** ****** ******
// -- -- -- -- -- -- -- -- -- --  MISC  -- -- -- -- -- -- -- -- -- -- --
// ****** ****** ****** ****** ****** ****** ****** ****** ****** ******







function random(max) {      // Helpful little random that is based on the global seed variable. Javascript, dissapointingly, doesn't have a randomseed() function.
    var x = Math.sin(seed++) * 10000;                   // This solves that.
    x = x - Math.floor(x)

    if (!(max == undefined)) {
        x = Math.floor(x * max)
    }

    return x;
};

async function wait(ms) {               // Pauses a function in case we need to wait for things to process. Used in the API
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function warn(msg) {            // Little tip here: Instead of using print() or console.log, use a custom warn() function that does the same thing.
                                // Then, if you need to shut off all those logs or want to log those warnings into a script, you can alter that ONE function
    console.log(msg)            // instead of every print/log call in your script.
}



















if (!module.parent) {
    bot.login('MzgwNTYyMjcxNTE4MDY0NjYy.DjO4qg.UzVLyJGg73J-8sgEOJ08PdGVva8');
}