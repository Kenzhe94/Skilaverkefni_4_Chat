import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import mongodb from 'mongodb';


const app = express();
const server = createServer(app);
const io = new Server(server);
const { MongoClient } = mongodb;

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, 'public')));

let listUserName = [];
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public/index.html'));
});
MongoClient.connect('mongodb://127.0.0.1/MongoChat', {useUnifiedTopology: true}, function(err, db) {
    if (err){
        throw err;
    }
    var chatdb = db.db("MongoChat");
    io.on('connection', (socket) => {
        // þegar notandi tengist með nafni
        socket.on('join', (user) => {
            socket.userName = user;
            io.emit('chat message', socket.userName+" - *connected*")
            console.log('user connected');
            listUserName.push(socket.userName);
            //uppfæri html listan af notendur
            io.emit('user list', listUserName);
            // byrta geymsla af chatid (History af chatid)
            
            chatdb.collection("messages").find({}, {projection:{_id:0, msg:1}}).toArray(function(err, result){
                if (err) throw err;
                result.forEach(element => {
                    socket.emit('chat message', element.msg);
                });
            });
        });
        // þegar sent er skilaboð
        socket.on('chat message', (msg) => {
            io.emit('chat message',getCurrentTime() + socket.userName+" skrifaði : "+ msg);
            chatdb.collection("messages").insertOne({msg:getCurrentTime()+socket.userName+" skrifaði : "+ msg, user: socket.userName});
        });
        // þegar það er ýtt á takka til að filtera history.
        socket.on('filter', (user)=>{
            chatdb.collection("messages").find({user:user}, {projection:{_id:0, msg:1}}).toArray(function(err, result){
                if (err) throw err;
                result.forEach(element => {
                    socket.emit('chat message', element.msg);
                });
            });
        });
        socket.on('synaHist', ()=>{
            chatdb.collection("messages").find({}, {projection:{_id:0, msg:1}}).toArray(function(err, result){
                if (err) throw err;
                result.forEach(element => {
                    socket.emit('chat message', element.msg);
                });
            });
        });
        // notandi hættir
        socket.on('disconnect', () => {
            //lætur vit að einstaklingurinn sé farinn/hættur
            console.log('user disconnect');
            io.emit('chat message', socket.userName+" - *discconect*");
            
            //leitir af userinn sem svökkvar á chatið og eyðir honum úr listan
            let stadsetning = listUserName.indexOf(socket.userName);
            if( stadsetning !== -1){
                listUserName.splice(stadsetning, 1);
            }
            //uppfæra html listan af notendur sem eru í chatið
            io.emit('user list', listUserName)
        });
    });
});
// tenging við chatið

// naer i tima til baeta vid texta ef tarf
function getCurrentTime(){
    const timi = new Date()
    const klst = String(timi.getHours()).padStart(2, '0');
    const min = String(timi.getMinutes()).padStart(2, '0');
    return `[${klst}:${min}] - `;
}

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});