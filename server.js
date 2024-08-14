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
        
        if(!rooms[room]){
            rooms[rooms] = {}
        }

        if(!users[user_id]){
            users[user_id] = user_name
        }

        rooms[room][user_id] = socket.id        
        socket.join(room)
        socket.to(room).broadcast.emit('user-joined',{user_id,user_name})
    })

    socket.on('sdp_offer',data =>{
        const {userFrom,userTo,room,offer} = data
        io.to(rooms[room][to]).emit('offer',{offer_from:socket.id,to:userTo,offer:offer})
    })
    socket.on('sdp_answer',data =>{
        const {userFrom,userTo,room,answer} = data
        io.to(rooms[room][to]).emit('answer',{offer_from:socket.id,to:userTo,answer:answer})
    })

    socket.on('RoomMessage',(data)=>{
        const {message,type,room,user_id} = data
        let payload = {
            type: type || 'chat',
            message : message,
            user_name : users[user_id]
        }
        socket.to(room).emit('RoomMessage',{payload,user_id})
    })

    socket.on('signal',(data)=>{
        const {type,message,from} = data
    })

})

server.listen(port,()=>{
    console.log(`Server is running on ${port}`)
})
