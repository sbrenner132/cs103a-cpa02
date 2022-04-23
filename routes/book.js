import User from "../models/User.js";
import Book from "../models/Book.js";
import sortJson from "sort-json";
import randomColor from "randomcolor";

const loadUserTagFrequency = async (req, res, next) => {
    const author_id = req.body.user._id;
    const books = await Book.find({ author_id });
    const tags = {};
    books.forEach(book => {
        const bookTags = book.tags;
        bookTags.forEach(tag => {
            if (tags[tag]) {
                tags[tag]++;
            } else {
                tags[tag] = 1;
            }
        });
    });
    for (const key in tags) {
        tags[key] /= books.length;
    }

    const options = { ignoreCase: true, depth: 1 };
    const frequencies = sortJson(tags, options);

    req.body.frequencies = limit(frequencies);
    next();
}

const loadUserBookPopularity = async (req, res, next) => {
    const author_id = req.body.user._id;
    const books = await Book.find({ author_id, public: true });
    let totalCollabs = 0;
    const bookSet = {};
    books.forEach(book => {
        const numCollabs = book.collaborators.length;
        bookSet[book.title] = numCollabs;
        totalCollabs += numCollabs;
    });
    for (const key in bookSet) {
        bookSet[key] /= totalCollabs;
    }

    const options = { ignoreCase: true, depth: 1 };
    const bookPopularity = sortJson(bookSet, options);

    req.body.bookPopularity = limit(bookPopularity);
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
        const user = await User.findOne({ name: collab });
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
    });

    book.save().then(() => {
        next();
    }).catch(e => next());
}

const loadMyBooks = async (req, res, next) => {
    const author_id = req.session.user._id;
    const allBooksData = await Book.find({ author_id });
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
    console.log('curr', curr_user);
    console.log('book author', book.author_id)
    if (book.author_id === curr_user) {
        next();
    } else if (!book.public) {
        console.log('collabls', book.collaborators)
        console.log('includes', book.collaborators.includes(curr_user))
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
    const { title, theme, text, created, author_id, color, tags } = book;
    const { _id, name, username } = await User.findById(author_id);
    req.body.book = {
        id, tags, color, title, theme, text, created, author: { id: _id, name, username }
    };
    next();
}

export {
    loadUserTagFrequency,
    loadUserBookPopularity,
    createBook,
    loadMyBooks,
    checkBookAccess,
    loadBook
};