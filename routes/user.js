import User from "../models/User.js";
import Book from "../models/Book.js";
import Notification from "../models/Notification.js";
import e from "connect-flash";

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

    // defining invalid options in results (self + friends)
    const invalid = [...req.session.user.friends];
    invalid.push(req.session.user._id);

    const docs = await User.find({
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
        ],
        $nor: [{
            _id: {
                $in: invalid
            }
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
    } else {
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
}

const loadNotifs = async (req, _res, next) => {
    if (req.session.user) {
        const user_id = req.session.user._id;
        const notifs = await Notification.find({
            for_user: user_id,
            read: false,
        });
        req.body.notifs = notifs.map(notif => ({
            ...notif._doc,
            new: function () {
                return Math.ceil(Math.abs(Date.now() - notif.sent) / (1000 * 60 * 60 * 24)) < 5;
            }, timeSince: function () {
                const diff = Math.floor(Math.abs(Date.now() - notif.sent) / 1000);
                if (diff < 60) {
                    return `${diff} seconds ago`;
                } else if (diff < 3600) {
                    const conversion = Math.floor(diff / 60);
                    return `${conversion} minute${conversion > 1 ? 's' : ''} ago`;
                } else if (diff < 86400) {
                    const conversion = Math.floor(diff / 3600);
                    return `${conversion} hour${conversion > 1 ? 's' : ''} ago`;
                } else if (diff < 604800) {
                    const conversion = Math.floor(diff / 86400);
                    return `${conversion} day${conversion > 1 ? 's' : ''} ago`;
                } else if (diff < 2.628e+6) {
                    const conversion = Math.floor(diff / 604800);
                    return `${conversion} week${conversion > 1 ? 's' : ''} ago`;
                } else if (diff < 3.154e+7) {
                    const conversion = Math.floor(diff / 2.628e+6);
                    return `${conversion} month${conversion > 1 ? 's' : ''} ago`;
                } else {
                    return 'More than a year ago'
                }
            }
        }));
    }
    next();
}

const filterFriendRequests = async (req, _res, next) => {
    const notifs = req.body.notifs;
    const filtered = notifs.filter(notif => notif.type === 'friend-request');
    const transformed = await Promise.all(filtered.map(async (notif) => {
        const from = await User.findById(notif.data.from);
        return {
            ...notif,
            from: {
                username: from.username,
                name: from.name,
                color: from.color,
                id: from._id
            },
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
        type: 'friend-request',
        clientMessage: `${req.session.user.name} (${req.session.user.username}) has sent you a friend request! Check the incoming request cards to accept or decline it.`
    });

    try {
        await notif.save();
    } catch (e) {
        next(e);
    }

    // add to outgoing requests
    try {
        await User.findByIdAndUpdate(outgoing_id, {
            $push: {
                outgoingRequests: requesting_id
            }
        });
        const user_id = req.session.user._id;
        const updated = await User.findById(user_id);
        req.session.user = updated;
        req.session.username = updated.username;
    } catch (e) {
        next(e);
    }

    next();
}

const userRequestsToNotifs = async (req, res, next) => {
    const user_requests = req.session.user.outgoingRequests;
    const from_id = req.session.user._id;
    const outgoing_notifs = await Promise.all(user_requests.map(async (request) => {
        const notif = await Notification.findOne({
            for_user: request,
            data: {
                from: from_id
            }
        });
        const user = await User.findById(request);
        return {
            for: {
                color: user.color,
                name: user.name,
                username: user.username
            },
            notif_id: notif._id
        }
    }));
    req.body.outgoing = outgoing_notifs;
    next();
}

const loadIncomingFriendRequests = async (req, res, next) => {
    const type = 'friend-request';
    const notifs = await Notification.find({
        type,
        for_user: req.session.user._id
    });
    const incoming_ids = notifs.map(notif => notif.data.from);
    req.body.incoming_requests = incoming_ids;
    next();
}

const becomeFriends = async (req, res, next) => {
    // patch request
    const id = req.body.notif_id;
    const notif = await Notification.findById(id);
    const to = await User.findById(notif.for_user);
    const from = await User.findById(notif.data.from);

    // update 'to' person
    await User.findByIdAndUpdate(to._id, {
        $push: {
            friends: String(from._id)
        }
    });

    // remove outgoing req from 'from'
    await User.findByIdAndUpdate(from._id, {
        $push: {
            friends: String(to._id)
        },
        $pull: {
            outgoingRequests: String(to._id)
        }
    });
    // delete old notif
    await Notification.findByIdAndDelete(id);
    // make new notif for from user
    const updateNotif = new Notification({
        type: 'friend-accept',
        for_user: from._id,
        clientMessage: `${to.name} (${to.username}) has accepted your friend request!`,
        data: {
            acceptee: to._id
        }
    });
    await updateNotif.save();

    // update session user
    const user_id = req.session.user._id;
    const updated = await User.findById(user_id);
    req.session.user = updated;
    req.session.username = updated.username;

    next();
}

const rejectFriendRequest = async (req, res, next) => {
    const id = req.body.notif_id;
    const notif = await Notification.findByIdAndDelete(id);
    const from = notif.data.from;
    await User.findByIdAndUpdate(from, {
        $pull: {
            outgoingRequests: notif.for_user
        }
    });
    const user_id = req.session.user._id;
    const updated = await User.findById(user_id);
    req.session.user = updated;
    req.session.username = updated.username;
    next();
}

const cancelFriendRequest = async (req, res, next) => {
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
    filterFriendRequests,
    userRequestsToNotifs,
    loadIncomingFriendRequests,
    becomeFriends,
    rejectFriendRequest,
    cancelFriendRequest
}