const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const io = require('socket.io')(server);

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

var usernames = {};

io.on('connection', (socket) => {
    console.log('Một người dùng đã kết nối');

    socket.on('add_user', (username) => {
        socket.username = username;
        usernames[username] = username;
        io.sockets.emit('notification', 'SERVER', username + 'đã tham gia phòng chat');

        io.sockets.emit('update_users', usernames);
    });

    socket.on('send_message', (data) => {
        io.sockets.emit('notification', socket.username, data);
    });

    socket.on('disconnect', () => {
        console.log('Người dùng đã ngắt kết nối');
        delete usernames[socket.username];
        io.sockets.emit('cap_nhat_thanh_vien', usernames);
        socket.broadcast.emit('notification', 'SERVER', socket.username + ' đã rời phòng chat');
    });
});

server.listen(3000, () => {
    console.log('listening on port 3000');
});
