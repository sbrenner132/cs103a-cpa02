import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const notifSchema = Schema({
    for_user: String, // user ID
    type: {
        type: String,
        default: 'friend-request'
    },
    data: Schema.Types.Mixed,
    read: {
        type: Boolean,
        default: false
    },
    sent: {
        type: Date,
        default: new Date()
    },
    clientMessage: String,
});

export default mongoose.model('Notification', notifSchema);