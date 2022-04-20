import User from "../models/User.js";
import Book from "../models/Book.js";
import sortJson from "sort-json";

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

    req.body.frequencies = frequencies;
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

    req.body.bookPopularity = bookPopularity;
    next();
}

export {
    loadUserTagFrequency,
    loadUserBookPopularity
};