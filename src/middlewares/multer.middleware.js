import multer from "multer";
import { nanoid } from "nanoid";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const unique = `${nanoid()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.filename}-${unique}`);
  },
});

export const upload = multer({
  storage,
});
