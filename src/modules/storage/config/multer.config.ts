import { memoryStorage } from "multer";
import { STORAGE_MAX_FILE_SIZE } from "../constants/storage.constants";

export const createMulterModuleOptions = () => {
  return {
    storage: memoryStorage(),
    limits: {
      fileSize: STORAGE_MAX_FILE_SIZE,
      files: 10,
    },
    fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
      const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
      const ext = file.originalname.toLowerCase().substring(
        file.originalname.lastIndexOf("."),
      );
      if (!allowedExtensions.includes(ext)) {
        cb(new Error("File extension not allowed"));
        return;
      }

      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "application/pdf",
      ];
      if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
        cb(new Error("File type not allowed"));
        return;
      }

      if (file.size > STORAGE_MAX_FILE_SIZE) {
        cb(new Error("File size exceeds the maximum allowed size of 5MB"));
        return;
      }

      cb(null, true);
    },
  };
};