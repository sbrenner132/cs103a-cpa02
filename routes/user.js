import User from "../models/User.js";
import Book from "../models/Book.js";

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
            },]
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

export {
    isLoggedIn,
    loadFriends,
    bookCount,
    lookUpUsers,
    trimUsersToCardData
}