import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const userSchema = Schema({
    username: String,
    name: String,
    passphrase: String,
    email: String
})

export default mongoose.model('User', userSchema);