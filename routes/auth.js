import express from 'express';
const router = express.Router();
import crypto from 'crypto';
import User from '../models/User.js';
import randomcolor from 'randomcolor';

router.use((req, res, next) => {
    if (req.session.username) {
        res.locals.loggedIn = true;
        res.locals.username = req.session.username;
        res.locals.user = req.session.user;
    } else {
        res.locals.loggedIn = false;
        res.locals.username = null;
        res.locals.user = null;
    }
    next();
});

router.post('/login', (req, res, next) => {
    try {
        const {
            username,
            password
        } = req.body;
        const hash = crypto.createHash('sha256');
        hash.update(password);
        const encrypted = hash.digest('hex');
        const user = User.findOne({
            username,
            passphrase: encrypted
        }).then(user => {

            req.session.username = user ? username : null;
            req.session.user = user;
            res.redirect('/');

        });

    } catch (e) {
        next(e);
    }
});

router.post('/signup', (req, res, next) => {
    try {
        const {
            username,
            password,
            repeat,
            email,
            name,
            twitter,
            insta,
            fb
        } = req.body;
        if (password !== repeat) {
            res.redirect('/register');
        } else {
            const hash = crypto.createHash('sha256');
            hash.update(password);
            const encrypted = hash.digest('hex');

            const user = new User({
                username,
                passphrase: encrypted,
                email,
                name,
                color: randomcolor(),
                twitter,
                insta,
                facebook: fb,
            });

            user.save().then(() => {
                req.session.username = user.username;
                req.session.user = user;
                res.redirect('/');
            })
        }
    } catch (e) {
        next(e);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/');
});

export default router;