import User from "../models/User.js";
import Book from "../models/Book.js";
import Notification from "../models/Notification.js";

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
    req.body.friends = friends;
    next();
}

const bookCount = async (req, res, next) => {
    const author_id = req.session.user._id;
    const count = _bookCount(author_id);
    req.body.bookCount = count;
    next();
}

const _bookCount = async (author_id) => {
    return await Book.countDocuments({
        author_id
    });
}

const lookUpUsers = async (req, res, next) => {
    const query = req.body.query;
    const docs = await User.find({
        $and: [{
            $or: [{
                    name: {
                        $regex: '.*' + query + '.*',
                        $options: 'i'
                    }
                },
                {
                    username: {
                        $regex: '.*' + query + '.*',
                        $options: 'i'
                    }
                }
            ]
        }, {
            $nor: [{
                _id: req.session.user._id,
            }, ]
        }]
    });
    req.body.docs = docs;
    next();
}

const trimUsersToCardData = async (req, _res, next) => {
    const docs = req.body.docs;
    if (!docs.length) {
        req.body.results = [undefined];
        next();
    }
    req.body.results = await Promise.all(docs.map(async (doc) => {
        const {
            _id,
            name,
            username,
            color,
            friends
        } = doc;
        const bookCount = await _bookCount(doc._id);
        return {
            _id,
            name,
            username,
            color,
            numFriends: friends.length,
            bookCount
        }
    }));
    next();
}

const loadNotifs = async (req, _res, next) => {
    if (req.session.user) {
        const user_id = req.session.user._id;
        const notifs = await Notification.find({
            for_user: user_id,
            read: false,
        });
        req.body.notifs = notifs;
    }
    next();
}

const filterFriendRequests = async (req, _res, next) => {
    const notifs = req.body.notifs;
    const filtered = notifs.filter(notif => notif.type === 'friend-request');
    const transformed = await Promise.all(notifs.map(async (notif) => {
        const from = await User.findById(notif.data.from);
        return {
            notif_id: notif.id,
            from: {
                username: from.username,
                name: from.name,
                color: from.color,
                id: from._id
            },
            sent: notif.sent,
            new: function () {
                return Math.ceil(Math.abs(Date.now() - notif.sent) / (1000 * 60 * 60 * 24)) < 5;
            }
        }
    }));
    req.body.friendRequests = transformed;
    next();
}

const sendRequest = async (req, _res, next) => {
    // register notification
    const outgoing_id = req.session.user._id;
    const requesting_id = req.body.request_id;
    const notif = new Notification({
        for_user: requesting_id,
        data: {
            from: outgoing_id
        },
        type: 'friend-request'
    });

    try {
        await notif.save();
    } catch (e) {
        next(e);
    }

    // add to outgoing requests
    const sendingUser = await User.findById(outgoing_id);
    const requests = sendingUser.outgoingRequests;
    requests.push(requesting_id);

    try {
        await User.updateOne({
            _id: outgoing_id
        }, {
            $set: {
                outgoingRequests: requests
            }
        });
        const updated = await User.findById(outgoing_id);
        req.session.username = updated.username;
        req.session.user = updated;
    } catch (e) {
        next(e);
    }

    next();
}

export {
    isLoggedIn,
    loadFriends,
    bookCount,
    lookUpUsers,
    trimUsersToCardData,
    loadNotifs,
    sendRequest,
    filterFriendRequests
}