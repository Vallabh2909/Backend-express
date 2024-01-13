// require("dotenv").dotenv.config({path:'/.env'})
import express from "express";
import connectDB from "./db/index.js";
import dotenv from "dotenv"

dotenv.config({
    path:'../.env'
})

 connectDB()


// const connectdb=()=>{
// }
/*import express from "express";
const app = express();
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("App Error:", error);
      throw error;
    });
    app.listen(`${process.env.PORT}`, () => {
      console.log(`App is on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log("ERROR:", error);
    throw error;
  }
})(); */
