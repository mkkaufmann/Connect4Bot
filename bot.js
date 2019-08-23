const Discord = require("discord.js");
const client = new Discord.Client();
const jimp = require("jimp");
const fs = require("fs");
const https = require("https");
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'email',
        pass: 'password'
    }
});

const mailOptions = {
    from: 'email',
    to: 'email',
    subject: 'BOT CONNECTION ERROR',
    text: 'Bot has disconnected'
};


let games = [];

let game = function () {
    this.id = 0;
    this.board = [0, 0, 0, 0, 0, 0, 0];
    this.redPlayerId = 0;
    this.yellowPlayerId = 0;
    this.colorIsRed = true;
    this.canPlay = true;
};
game.prototype.play = function (row, colorIsRed, callback) {

    let id = this.id;

    if (this.board[row] >= 6) {
        //alert user of invalid move
        console.log("invalid move");
    } else {
        let x1 = (row + 1) * 2 + (row) * 100;
        //let x2 = (row)*2+(row+1)*100 /*+ 1*/;
        let y1 = (6 - (this.board[row])) * 2 + (5 - (this.board[row])) * 100;
        //let y2 = (5-(board[row]))*2+(6-(board[row]))*100 + 1;
        jimp.read("images/board" + this.id.toString() + ".png").then(function (image) {
            image.scan(x1, y1, 100, 100, function (x, y, idx) {
                // x, y is the position of this pixel on the image
                // idx is the position start position of this rgba tuple in the bitmap Buffer
                // this is the image

                this.bitmap.data[idx] = 255;
                this.bitmap.data[idx + 1] = colorIsRed ? 0 : 216;
                this.bitmap.data[idx + 2] = 0;
                this.bitmap.data[idx + 3] = 255;
                // rgba values run from 0 - 255
                // e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
            });

            image.write("images/board" + id.toString() + ".png");
            setTimeout(callback, 150);
        }).catch(function (err) {
            console.log(err);
        });

        this.board[row]++;
    }
};
game.prototype.start = function (redUser, yellowUser, callback) {
    let id = this.id;
    // let redUserAvatar = fs.createWriteStream("avatar"+redUser.id+".png");
    // https.get(redUser.avatarURL, function(response) {
    //     response.pipe(redUserAvatar);
    // });
    // let yellowUserAvatar = fs.createWriteStream("avatar"+yellowUser.id+".png");
    // https.get(yellowUser.avatarURL, function(response) {
    //     response.pipe(yellowUserAvatar);
    // });
    jimp.read("images/board.png").then(function (image) {
        image.write("images/board" + id.toString() + ".png");
    });
    setTimeout(callback, 100);
};
game.prototype.end = function () {
    games.splice(games.indexOf(this), 1);
};

function findGameById(id) {
    return games.find(function (i) {
        return i.id === id;
    });
}

client.login("token");

client.on("ready", () => {
    console.log("Bot online.");
    client.user.setPresence({status: 'online', game: {name: '*help | ' + client.guilds.array().length + " guilds"}})
});
let channel;
let collector;
client.on("message", message => {
    if (message.guild.id === "220298228741046272" && message.channel.id === "220298228741046272") {
        console.log(message.member.nickname + "/" + message.author.username + ": " + message.content);
        channel = message.channel;
    }
    if (message.guild.id === "446804649685811200") {
        if (message.content.substr(0, 3) === "`s ") {
            if (channel) {
                channel.send(message.content.substring(3));
            }
        }
    }
    if (message.content.substr(0, 6) === "*start") {
        if (!findGameById(message.guild.id)) {
            let mentions = message.mentions.members.array();
            if (mentions.length === 1) {
                if (mentions[0] !== message.member) {
                    let gameInstance = new game;
                    games.push(gameInstance);
                    gameInstance.redPlayerId = message.author.id;
                    gameInstance.yellowPlayerId = mentions[0].user.id;
                    gameInstance.id = message.guild.id;
                    gameInstance.start(message.author, mentions[0].user.id, () => {
                        message.channel.send({
                            files: [{
                                attachment: 'images/board.png',
                                name: 'connect4.png'
                            }]
                        }).catch(console.error);
                    });

                } else {
                    message.reply("you can't play Connect4 against yourself!");
                }
            } else {
                message.reply("try '*play @opponent'");
            }
        } else {
            message.reply("sorry, there is already a game being played in the server.")
        }
    } else if (message.content.substr(0, 6) === "*play ") {
        let gameInstance = findGameById(message.guild.id);
        if (gameInstance) {
            if (!gameInstance.canPlay) {
                message.reply("sorry, the bot is busy right now. Please wait.");
                return
            }
            if (message.author.id === (gameInstance.colorIsRed ? gameInstance.redPlayerId : gameInstance.yellowPlayerId)) {
                let column = parseInt(message.content.substring(6));
                if (!isNaN(column)) {
                    if (!(column < 1 || column > 7)) {
                        if (gameInstance.board[column - 1] < 6) {
                            gameInstance.canPlay = false;
                            gameInstance.play(column - 1, gameInstance.colorIsRed, () => {
                                gameInstance.canPlay = true;
                                gameInstance.colorIsRed = !gameInstance.colorIsRed;
                                message.channel.send({
                                    files: [{
                                        attachment: 'images/board' + gameInstance.id + '.png',
                                        name: 'connect4.png'
                                    }]
                                })
                                    .catch(console.error);
                            });
                        } else {
                            message.reply("this column is full. Make a valid move.");
                        }
                    } else {
                        message.reply("please submit a number between 1 and 7.");
                    }
                } else {
                    message.reply("please submit a valid number.");
                }
            } else if (message.author.id === (!gameInstance.colorIsRed ? gameInstance.redPlayerId : gameInstance.yellowPlayerId)) {
                message.reply("please wait your turn.");
            } else {
                message.reply("sorry, there is already a game being played in the server.")
            }
        } else {
            message.reply("there doesn't seem to be a game going on in your server. Feel free to start one with '*start.'");
        }
    } else if (message.content === "*end") {
        let gameInstance = findGameById(message.guild.id);
        if (gameInstance) {
            if (message.author.id === gameInstance.redPlayerId || message.member.roles.find(function (i) {
                return i.name === "Organizers"
            } || message.member.roles.find(function (i) {
                return i.name === "Admin"
            })) || message.author.id === "260539712819822602") {
                gameInstance.end();
                message.reply("game ended");
            } else {
                message.reply("you do not have permission to end this game. If there is an idle game going on, please contact the admins and they can end it.");
            }
        } else {
            message.reply("there doesn't seem to be a game going on in your server. Feel free to start one with '*start.'");
        }
    } else if (message.content === "*help") {
        message.channel.send("```\n*start and mention someone (in the same message) to start a game against them.\n*play (1-7) - plays in the column chosen (1-7 left to right)\n*end to end the game (restricted to organizers and the user that started the game)\n```");
    }
});
client.on("error", e => {
    console.log(e.message);
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
});