import mongoose from 'mongoose';
// import User from './User.js';
const Schema = mongoose.Schema;

const bookSchema = Schema({
    title: String,
    author_id: Number,
    text: String,
    created: Date,
    public: Boolean,
    tags: Array,
    editors: Array,
});

export default mongoose.model('Book', bookSchema)