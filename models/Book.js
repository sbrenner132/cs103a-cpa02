import mongoose from 'mongoose';
// import User from './User.js';
const Schema = mongoose.Schema;

const bookSchema = Schema({
    title: String,
    author_id: String,
    text: String,
    created: Date,
    public: Boolean,
    tags: Array,
    collaborators: Array,
    theme: String,
    color: String,
});

export default mongoose.model('Book', bookSchema)