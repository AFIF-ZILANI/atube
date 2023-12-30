import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (path) => {
  try {
    if (path) {
      const response = await cloudinary.uploader.upload(path, {
        resource_type: "auto",
      });
      // console.log("file uploaded on cloudinary successfully!");
      fs.unlinkSync(path);

      return response;
    } else {
      return null;
    }
  } catch (error) {
    console.log(error);
    fs.unlinkSync(path);
    return null;
  }
};
