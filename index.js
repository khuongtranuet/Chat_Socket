const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const io = require('socket.io')(server);
const mysql = require('mysql');
const { off } = require("process");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "12345678",
    database: "chat_socket",
});

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

let usernames = {};
let roomid = {};

io.use((socket, next) => {
    const username = socket.handshake.auth.username;
    const password = socket.handshake.auth.password;
    if(username && password) {
        db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, result, fields) => {
            if (err) {
                console.log('MySQL Query Error --> '+ err);
            }
            else{
                console.log(result);
                if(!result.length) {
                    return next(new Error("LoginError"));
                }
                socket.username = username;
                usernames[username] = username;
                roomid[socket.id] = username;
                next();
            }
        });
    }else{
        return next(new Error("LoginError"));
    }
});

io.on('connection', (socket) => {
    console.log('Một người dùng đã kết nối');

    socket.emit('login', usernames, socket.username);
    io.sockets.emit('notification', 'SERVER', socket.username + ' đã tham gia kênh thế giới');
    io.sockets.emit('update_users', usernames);
    io.sockets.emit('listroom', roomid);

    socket.on('add_user', (username) => {
        socket.username = username;
        usernames[username] = username;
        io.sockets.emit('notification', 'SERVER', username + ' đã tham gia kênh thế giới');

        io.sockets.emit('update_users', usernames);
    });

    socket.on('send_message', (data) => {
        io.sockets.emit('notification', socket.username, data);
    });

    socket.on('disconnect', () => {
        console.log('Người dùng đã ngắt kết nối');
        delete usernames[socket.username];
        delete roomid[socket.id];
        io.sockets.emit('update_users', usernames);
        io.sockets.emit('listroom', roomid);
        socket.broadcast.emit('notification', 'SERVER', socket.username + ' đã ngắt kết nối');
    });

    socket.on('base64 file', (msg) => {
        console.log('received base64 file from');
        // socket.username = msg.username;
        io.sockets.emit('base64 file',
            {
              username: socket.username,
              file: msg.file,
              fileName: msg.fileName
            }
    
        );
    });

    socket.on('base64 file room', (msg, idRoom) => {
        console.log('received base64 file from');
        // socket.username = msg.username;
        io.sockets.to(idRoom).emit('base64 file room',
            {
              username: socket.username,
              file: msg.file,
              fileName: msg.fileName
            }
    
        );
    });

    socket.on('create_room', (room) => {
        let list_room = [];
        socket.join(room);
        socket.Room = room;
        console.log(socket.rooms);
        let checkroom = Object.values(roomid).filter((i => i === room))
        if(!checkroom.length) {
            roomid[room] = room;
        }
        // for(r of io.sockets.adapter.rooms) {
            // console.log(r);
            // roomid[room] = room;
        // }
        io.sockets.emit('listroom', roomid);
        socket.emit('nameroom', room);
    });

    socket.on('send_room', (msg, idRoom) => {
        io.sockets.to(idRoom).emit('messagetoroom', socket.username, msg);
    });
});

server.listen(3000, () => {
    console.log('listening on port 3000');
});
