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
    const count = (await Book.find({author_id})).length;
    req.body.bookCount = count;
    next();
}

export {
    isLoggedIn,
    loadFriends,
    bookCount,
}