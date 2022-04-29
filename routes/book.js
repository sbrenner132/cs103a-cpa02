import User from "../models/User.js";
import Book from "../models/Book.js";
import sortJson from "sort-json";
import randomColor from "randomcolor";

const loadUserTagFrequency = async (req, res, next) => {
    const author_id = req.body.user._id;
    let books = await Book.find({
        author_id
    });
    books = books.filter(book => book.tags.length > 1 || (book.tags.length === 1 && book.tags[0] !== ''))
    const tags = {};
    books.forEach(book => {
        const bookTags = book.tags;
        bookTags.forEach(tag => {
            if (tag !== '') {
                if (tags[tag]) {
                    tags[tag]++;
                } else {
                    tags[tag] = 1;
                }
            }
        });
    });
    for (const key in tags) {
        tags[key] /= books.length;
    }

    const options = {
        ignoreCase: true,
        depth: 1
    };
    const frequencies = sortJson(tags, options);

    req.body.frequencies = limit(frequencies);
    next();
}

const loadUserBookPopularity = async (req, res, next) => {
    const author_id = req.body.user._id;
    const books = await Book.find({
        author_id,
        public: true
    });
    let totalCollabs = 0;
    const bookSet = {};
    const bookIds = {};
    books.forEach(book => {
        const numCollabs = book.collaborators.length;
        bookSet[book.title] = numCollabs;
        bookIds[book.title] = String(book._id);
        totalCollabs += numCollabs;
    });
    for (const key in bookSet) {
        bookSet[key] /= totalCollabs;
    }

    const options = {
        ignoreCase: true,
        depth: 1
    };
    const bookPopularity = sortJson(bookSet, options);

    req.body.bookPopularity = limit(bookPopularity);
    req.body.bookIds = bookIds;
    next();
}

const limit = (json) => {
    const lim = 5;
    let count = 0;
    const out = {};
    for (let key in json) {
        if (count === lim) {
            break;
        } else {
            out[key] = json[key];
            count++;
        }
    }
    return out;

}

const createBook = async (req, res, next) => {
    const {
        title,
        theme,
        pub,
        start
    } = req.body;
    const tags = req.body.tagSet.split('#');
    const author_id = req.session.user._id;
    const created = new Date();
    let collabs = undefined;
    if (typeof (pub) === 'undefined') {
        collabs = req.body.collaborators.split('#')
    }
    const collaborators = collabs && ![''].every((val, index) => val === collabs[index]) ? await Promise.all(collabs.map(async (collab) => {
        const user = await User.findOne({
            name: collab
        });
        return String(user._id);
    })) : [];

    const book = new Book({
        title,
        theme,
        author_id,
        created,
        tags,
        text: start,
        public: typeof (pub) === 'undefined' ? false : true,
        collaborators,
        color: randomColor(),
        last_author_id: author_id
    });
    req.body.bookId = String(book._id);
    book.save().then(() => {
        next();
    }).catch(e => next());
}

const loadMyBooks = async (req, res, next) => {
    const author_id = req.session.user._id;
    const allBooksData = await Book.find({
        author_id
    });
    const books = allBooksData.map(book => ({
        title: book.title,
        theme: book.theme,
        color: book.color,
        id: book._id
    }));
    req.body.books = books;
    next();
}

const checkBookAccess = async (req, res, next) => {
    const id = req.params.id;
    const book = await Book.findById(id);
    const curr_user = String(req.session.user._id);
    if (book.author_id === curr_user) {
        next();
    } else if (!book.public) {
        if (!book.collaborators.includes(curr_user)) {
            res.redirect('/');
        } else {
            next();
        }
    } else {
        next();
    }
}

const loadBook = async (req, res, next) => {
    const id = req.params.id;
    const book = await Book.findById(id);
    const {
        title,
        theme,
        text,
        created,
        author_id,
        color,
        tags,
        last_author_id
    } = book;
    const {
        _id,
        name,
        username
    } = await User.findById(author_id);
    req.body.book = {
        id,
        tags,
        color,
        title,
        theme,
        text,
        created,
        author: {
            id: _id,
            name,
            username
        },
        last_author_id
    };
    next();
}

const determineLastContribtor = (req, res, next) => {
    const book = req.body.book;
    const canContribute = String(book.last_author_id) !== String(req.session.user._id);
    req.body.canContribute = canContribute;
    next();
}

const contribute = async (req, res, next) => {
    const {
        word
    } = req.body;
    const id = req.params.id;
    const book = await Book.findByIdAndUpdate(id, [{
        $set: {
            text: {
                $concat: [
                    "$text",
                    ` ${word}`
                ]
            },
            last_author_id: String(req.session.user._id)
        }
    }]);
    if (book.public && book.author_id !== String(req.session.user._id)) {
        await Book.findByIdAndUpdate(id, {
            $addToSet: {
                collaborators: String(req.session.user._id)
            }
        });
    }
    next();
}

const findBooks = async (req, res, next) => {
    const query = req.query.query || '';
    const publicBooks = await Book.find({
        public: true,
        title: {
            $regex: '.*' + query + '.*',
            $options: 'i'
        }
    });
    const sharedPrivateBooks = await Book.find({
        public: false,
        collaborators: String(req.session.user._id),
        title: {
            $regex: '.*' + query + '.*',
            $options: 'i'
        }
    });
    req.body.publicBooks = await Promise.all(publicBooks.map(async (book) => {
        const user = await User.findById(book.author_id);
        return {
            id: book._id,
            color: book.color,
            title: book.title,
            author: user.name
        }
    }));
    req.body.sharedPrivateBooks = await Promise.all(sharedPrivateBooks.map(async (book) => {
        const user = await User.findById(book.author_id);
        return {
            id: book._id,
            color: book.color,
            title: book.title,
            author: user.name
        }
    }));;
    next();
}

export {
    loadUserTagFrequency,
    loadUserBookPopularity,
    createBook,
    loadMyBooks,
    checkBookAccess,
    loadBook,
    determineLastContribtor,
    contribute,
    findBooks
};