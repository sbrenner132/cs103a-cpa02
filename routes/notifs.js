import Notification from "../models/Notification";

const getFriendRequestOutgoingNotification = async (req, res, next) => {
    const sender_id = req.session.user._id;
    const receiver_id = req.body.receiver_id;

    const notif = await Notification.find({
        for_user: receiver_id,
        data: {
            from: sender_id
        }
    });
}

export {
    getFriendRequestNotifsFromSenderReciever,
}