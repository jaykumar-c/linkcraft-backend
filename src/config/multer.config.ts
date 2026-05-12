import { memoryStorage } from "multer";
import {
  STORAGE_MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from "src/common/config/constants/common.constants";

export const createMulterModuleOptions = () => {
  return {
    storage: memoryStorage(),
    limits: {
      fileSize: STORAGE_MAX_FILE_SIZE,
      files: 10,
    },
    fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
      const ext = file.originalname
        .toLowerCase()
        .substring(file.originalname.lastIndexOf("."));
      if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
        cb(new Error("File extension not allowed"));
        return;
      }

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase() as typeof ALLOWED_MIME_TYPES[number])) {
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
