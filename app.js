import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import bodyParser from 'body-parser';
import debug from 'debug';
import layouts from 'express-ejs-layouts';

// dotenv setup

import dotenv from 'dotenv';
dotenv.config();

// es module setup

import {
    fileURLToPath
} from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

// setting up mongoose

import mongoose from 'mongoose';
const mongo_URI = `mongodb+srv://sbrenner:${process.env.MONGO_SECRET}@cluster0.uhhej.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const db = mongoose.connection;

mongoose.connect(mongo_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
db.on('error', console.error.bind(console, 'mongoose connection error'));
db.on('open', console.log.bind(console, 'connected to mongoose without problems'));

// setting up express server

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(layouts);

app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    })
);

// auth setup

import auth from './routes/auth.js';
app.use(auth);

// ****************************************************************** //
// This section defines the routes the Express server will respond to //
// ****************************************************************** //    

const isLoggedIn = (_req, res, next) => {
    if (res.locals.loggedIn) {
        next();
    } else res.redirect('/')
}

const loadFriends = async (req, res, next) => {
    // res.locals.friends = req.session.user.friends;
    const friend_ids = req.session.user.friends;
    const friends = await Promise.all(friend_ids.map(async (id) => {
        const friend = await User.findById(id);
        return friend.name;
    }));
    res.locals.friends = friends;
    next();
}

app.get('/', (_req, res, next) => {
    res.render('index');
});

app.get('/register', (_req, res, next) => {
    res.render('register');
});

app.get('/create', isLoggedIn, loadFriends, (req, res, _next) => {
    res.render('createBook');
});

app.use((_req, _res, next) => {
    next(createError(404));
});

// setting up the http connection

const port = process.env.PORT || '3000';
app.set('port', port);

import http from 'http';
import User from './models/User.js';
const server = http.createServer(app);

server.listen(port);

server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    } else {
        const bind = `${typeof port === "string" ? "Port" : "Pipe"} ${port}`;
        switch (error.code) {
            case 'EACCES':
                console.error(`${bind} requires elevated privileges`);
                process.exit(1);
            case 'EADDRINUSE':
                console.error(`${bind} is already in use`);
                process.exit(1);
            default:
                throw error;
        }
    }
});

server.on('listening', () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `Pipe ${addr}` : `Port ${addr.port}`;
    debug(`Listening on ${bind}`);
});