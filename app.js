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
    useFindAndModify: false,
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

import {
    isLoggedIn,
    loadFriends,
    bookCount,
    lookUpUsers,
    trimUsersToCardData,
    loadNotifs,
    sendRequest,
    filterFriendRequests,
    userRequestsToNotifs,
    loadIncomingFriendRequests,
    becomeFriends,
    rejectFriendRequest,
    loadUser,
    loadAllFriendInfo,
} from './routes/user.js';
import {
    loadUserTagFrequency,
    loadUserBookPopularity,
    createBook,
    loadMyBooks,
    checkBookAccess,
    loadBook,
    determineLastContribtor,
    contribute,
    findBooks
} from './routes/book.js';
import Book from './models/Book.js';

app.get('/', loadNotifs, (req, res, next) => {
    res.locals.notifs = req.body.notifs;
    res.render('index');
});

app.get('/register', (_req, res, next) => {
    res.render('register');
});

app.get('/create', isLoggedIn, loadNotifs, loadFriends, bookCount, (req, res, _next) => {
    res.locals.friends = req.body.friends;
    res.locals.bookCount = req.body.bookCount;
    res.locals.notifs = req.body.notifs;
    res.render('createBook');
});

app.post('/create', isLoggedIn, loadNotifs, createBook, async (req, res, next) => {
    res.redirect(`/book/${req.body.bookId}`);
});

app.get('/findfriends', isLoggedIn, loadNotifs, (req, res, next) => {
    res.locals.results = [];
    res.locals.notifs = req.body.notifs;
    res.render('findfriends');
});

app.post('/findfriends', isLoggedIn, loadNotifs, lookUpUsers, trimUsersToCardData, loadIncomingFriendRequests, (req, res, next) => {
    res.locals.results = req.body.results;
    res.locals.notifs = req.body.notifs;
    res.locals.incoming = req.body.incoming_requests;
    res.render('findfriends');
});

app.post('/requestfriend', isLoggedIn, sendRequest, async (req, res, next) => {
    res.redirect('/notifications');
});

app.get('/notifications', isLoggedIn, loadNotifs, filterFriendRequests, userRequestsToNotifs, (req, res, next) => {
    res.locals.notifs = req.body.notifs;
    res.locals.requests = req.body.friendRequests;
    res.locals.outgoing = req.body.outgoing;
    res.render('notifications');
});

app.post('/acceptFriendRequest', isLoggedIn, becomeFriends, (req, res, next) => {
    res.redirect('/notifications');
})

app.post('/rejectFriendRequest', isLoggedIn, rejectFriendRequest, (req, res, next) => {
    res.redirect('/notifications');
});

app.get('/profile/:id', loadNotifs, loadIncomingFriendRequests, loadUser, loadUserTagFrequency, loadUserBookPopularity, async (req, res, next) => {
    res.locals.notifs = req.body.notifs;
    res.locals.userProfile = req.body.user;
    res.locals.incoming = req.body.incoming_requests || [];
    res.locals.frequencies = req.body.frequencies;
    res.locals.bookPopularity = req.body.bookPopularity;
    res.locals.bookIds = req.body.bookIds;
    res.render('profile');
});

app.get('/friends', isLoggedIn, loadNotifs, loadAllFriendInfo, async (req, res, next) => {
    res.locals.notifs = req.body.notifs;
    res.locals.friends = req.body.friends;
    res.render('friends');
});

app.get('/library', isLoggedIn, loadNotifs, loadMyBooks, (req, res, next) => {
    res.locals.notifs = req.body.notifs;
    res.locals.books = req.body.books;
    res.render('library');
});

app.get('/book/:id', isLoggedIn, loadNotifs, checkBookAccess, loadBook, determineLastContribtor, (req, res, next) => {
    res.locals.notifs = req.body.notifs;
    res.locals.book = req.body.book;
    res.locals.canContribute = req.body.canContribute;
    res.render('book')
});

app.post('/book/:id', isLoggedIn, checkBookAccess, contribute, (req, res, next) => {
    res.redirect(`/book/${req.params.id}`);
});

app.get('/browse', isLoggedIn, loadNotifs, findBooks, async (req, res, next) => {
    res.locals.notifs = req.body.notifs;
    res.locals.publicBooks = req.body.publicBooks;
    res.locals.sharedPrivateBooks = req.body.sharedPrivateBooks;
    res.render('browse');
});

app.get('/finished', isLoggedIn, loadNotifs, async (req, res, next) => {
    res.locals.notifs = req.body.notifs;
    res.render('finished');
});

app.use((_req, _res, next) => {
    next(createError(404));
});

// setting up the http connection

const port = process.env.PORT || '3000';
app.set('port', port);

import http from 'http';
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