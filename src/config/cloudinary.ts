import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { CLOUDINARY_KEY, CLOUDINARY_NAME, CLOUDINARY_SECRET } from "./env";

dotenv.config();

cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_KEY,
  api_secret: CLOUDINARY_SECRET,
  secure: true,
});

export const cloudUploader = cloudinary.uploader;

export const cloudApi = cloudinary.api;
