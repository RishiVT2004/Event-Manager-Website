import User from '../../models/UserModel.js'
import Event from '../../models/EventModel.js'
import Booking from '../../models/BookingModel.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import zod from 'zod'

export const getCurrentEvent = async(req,res) => {
    try{
        const currentEvents = await Event.find()
        if(!currentEvents){
            return res.status(403).json({message  : "No upcoming Events availiable"})
        }
        return res.status(200).json({
            message : "List of Upcoming Events",
            currentEvents
        })
    }catch(err){
        return res.status(500).json({ 
            message: "Server Error",
            error: err.message 
        });
    }
}

export const getEventDetails = async(req,res) => {
    
    const {eventID} = req.params
    try{
        const event = await Event.findById(eventID);

        if(!event){
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ message: "Event details", event });
    }
    catch(err){
        return res.status(500).json({ 
            message: "Server Error",
            error: err.message 
        })
    }
}

export const BookEvent = async(req,res) => {
    
    if(!req.user){
        return res.status(403).json({message : "Only User can book tickets for an event"})
    }
    const UserID = req.user.id
    try{
        const {EventID} = req.params;
        const {tickets} = req.body;
        const user = await User.findById(UserID);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        const userEmailID = user.UserInfo[0].EmailID;

        const event = await Event.findById(EventID)
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        if(event.Capacity < tickets){
            return res.status(403).json({message : "Not enought Tickets availiable"})
        }else if(event.Capacity == 0){
            return res.status(403).json({message : "No Tickets availiable"})            
        }
        
        event.Capacity -= tickets

        event['Registered_Users'].push({
            "UserID" : req.user.id,
            "UserEmail" : userEmailID
        })
        const eventUpdate = await event.save();
        const booking = await Booking.create({
            "UserID" : req.user.id,
            "Event" : EventID,
            "TicketQuantity" : tickets
        })
        if(!eventUpdate || ! booking){
            return res.status(403).json({message  : "Booking Failed"})
        }

        return res.status(200).json({
            "message" : "Booking succesfull",
            "booking details" : booking
        })
       
    }catch(err){
        return res.status(500).json({ 
            message: "Server Error",
            error: err.message 
        })
    }
}
       

export const getUserRegisteredEvents = async(req,res) => {
    if(!req.user){
        return res.status(403).json({message : "Only User can book tickets for an event"})
    }

    const UserID = req.user.id;

    try{
        const registeredEvent = await Event.find({_id : UserID}) // multile ids 
        if(!registeredEvent || registeredEvent.length === 0){
            return res.status(404).json({message  : "User has not registered in any event"})
        }
        
        const eventList = registeredEvent.map(event => { // reference to Event 
            return {
                eventID : event._id,
                EventName : event.Name,
                EventDate : event.Date
            }
        })
        
       
        return res.status(200).json({
            message : "List of event User has registered in are : ",
            eventList
        })

    }catch(err){
        return res.status(500).json({ 
            message: "Server Error",
            error: err.message 
        });
    }
}

export const deleteBooking = async(req,res) => {
    if(!req.user){
        return res.status(403).json({message : "Only User can book tickets for an event"})
    }
    const {eventID} = req.params
    const userID = req.user.id
    try{
        const eventFromBookingIsToBeDeleted = await Event.findById(eventID)
        if(!eventFromBookingIsToBeDeleted){
            return res.status(404).json({ message: "Event not found" });
        }
        const regiseredUser = eventFromBookingIsToBeDeleted['Registered_Users'].find(user => 
            user.UserID.equals(userID)
        )
        if(!regiseredUser){
            return res.status(404).json({ message: "User is not registered to this event" });
        }

        await Event.findByIdAndUpdate(
            eventID,
            {$pull : {Registered_User : {UserID : userID}}},
            {new : true}
        )

        return res.status(200).json({ message: "Booking successfully deleted" });

    }catch(err){
        return res.status(500).json({ 
            message: "Server Error",
            error: err.message 
        });
    }
}