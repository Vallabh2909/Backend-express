import mongoose, { Schema } from "mongoose";

const subscriptionSchema=new Schema({
    subscribers:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    channel:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    channelName:{
        type:String,
        required:true
    }
},{
    timestamps:true
})

subscriptionSchema.methods.subscribe=function(user){
    
}

export const Subscription=mongoose.model("Subscription",subscriptionSchema)