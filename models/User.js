import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const userSchema = Schema({
    username: String,
    name: String,
    passphrase: String,
    email: String,
    friends: Array,
    color: String,
    outgoingRequests: Array,
    since: {
        type: Date,
        default: new Date()
    },
    twitter: String,
    insta: String,
    facebook: String
});

export default mongoose.model('User', userSchema);