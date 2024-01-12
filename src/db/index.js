import { DB_NAME } from "../../constants.js";
import mongoose from "mongoose";

const connectDB=async()=>{
    try {
        const connectionInstannce=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n
        MongpDB Connnected!! DB Host : ${connectionInstannce.connection.host}`)
      } catch (error) {
        console.log("MongoDB Connection Error:", error);
        process.exit(1);
      }
}
export default connectDB;