const express = require('express')
const https = require('https')
const fs = require('fs')
const socketIO = require('socket.io')
const cors = require('cors')
const app = express()
app.use(cors())
app.use(express.static('public'))
app.use(express.json({limit:'200mb',extended:true}))
app.use(express.urlencoded({limit:'200mb',extended:true}))

const serverOption = {
    key: fs.readFileSync('key.pem'), // Replace domain/local/ip SSL key.pem 
    cert: fs.readFileSync('cert.pem') // Replace domain/local/ip SSL cert.pem
}
const server = https.createServer(serverOption,app)
const io = socketIO(server,{
    allowEI03:true,
    cors:{
        origin:['https://localhost:5000','https://ip address:5000','https://domain name:5000']
    }
})
const port = process.env.PORT || 5000
const users = {}
const rooms = {}
io.on('connection',(socket)=>{
    console.log(`New client connected socket Id = ${socket.id}`)
    socket.on('join',data=>{
        const {room,user_id,user_name} = data       
        
        if (!rooms[room]) {
            rooms[room] = {}
        }

        if(!users[user_id]){
            users[user_id] = user_name
        }

        rooms[room][user_id] = socket.id 
        socket.join(room)
        socket.to(room).emit('user-joined',{user_id,user_name})
    })
    
    socket.on('user-left',data=>{
        const {room,user_id,user_name} = data
        
        // Remove user from all rooms
        if(rooms[room]){
            if (rooms[room][user_id]){
                delete rooms[room][user_id];
            }
        }       
        
        if (users[user_id]) {
            delete users[user_id];
        }
        socket.to(room).emit('user-left', { user_id: user_id,room:room,user_name:user_name });
        console.log(`user left = ${user_id}`);
    })

    socket.on('getRoomMembers', (room, callback) => {
        if (rooms[room]) {
            // Get the list of members in the room
            const members = Object.entries(rooms[room]).map(([user_id, user_name]) => ({ user_id, user_name:users[user_id],socketId : user_name }));
            callback(members);
        } else {
            callback([]);
        }
    });

    socket.on('sdp_offer',data =>{
        const {userFrom,userTo,room,offer} = data
        console.log(rooms[room][userTo])
        socket.to(rooms[room][userTo]).emit('offer',{offer_from:userFrom,to:userTo,offer:offer})
    })

    socket.on('ice-candidate',data =>{
        const {userFrom,userTo,room,candidate} = data
        console.log(rooms[room][userTo])
        socket.to(rooms[room][userTo]).emit('ice-candidate',{candidate_from:userFrom,to:userTo,candidate:candidate})
    })

    socket.on('sdp_answer',data =>{
        const {userFrom,userTo,room,answer} = data
        socket.to(rooms[room][userTo]).emit('answer',{answer_from:userFrom,to:userTo,answer:answer})
    })

    socket.on('RoomMessage',(data)=>{
        console.log(data)
        const {message,type,room,user_id,name} = data
        let payload = {
            type: type || 'chat',
            message : message,
            user_name : users[user_id] || name
        }
        socket.to(room).emit('RoomMessage',{payload})
    })

    socket.on('signal',(data)=>{
        const {type,message,from} = data
    })

    socket.on('disconnect', () => {
        console.log(`Client disconnected socket Id = ${socket.id}`);
        
        // Remove user from all rooms
        for (const room in rooms) {
            if (rooms[room][socket.id]) {
                delete rooms[room][socket.id];
                socket.to(room).emit('user-left', { user_id: socket.id, });
            }
        }
        
        // Optionally, remove user from the `users` object if needed
        if (users[socket.id]) {
            delete users[socket.id];
        }
    });

})

server.listen(port,()=>{
    console.log(`Server is running on ${port}`)
})
