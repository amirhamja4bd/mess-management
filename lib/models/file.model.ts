import { Schema, Types, model, models } from "mongoose";
import type { Model } from "mongoose";
import { FILE_PURPOSE } from "@/lib/constants/enums";
import type { FilePurpose } from "@/lib/constants/enums";

export interface IFile {
  organizationId?: Types.ObjectId | null;
  uploadedByUserId: Types.ObjectId;
  purpose: FilePurpose;
  fileName: string;
  mimeType?: string;
  size?: number;
  /** Location of the stored file (bucket key / CDN URL). */
  storageKey?: string;
  url?: string;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const fileSchema = new Schema<IFile>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    uploadedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    purpose: {
      type: String,
      enum: Object.values(FILE_PURPOSE),
      required: true,
      default: FILE_PURPOSE.RECEIPT,
    },
    fileName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, maxlength: 120 },
    size: { type: Number, min: 0 },
    storageKey: { type: String, maxlength: 1000 },
    url: { type: String, maxlength: 2000 },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "files",
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

fileSchema.index({ organizationId: 1, createdAt: -1 });
fileSchema.index({ uploadedByUserId: 1, createdAt: -1 });
fileSchema.index({ deletedAt: 1 });

export const FileModel: Model<IFile> =
  (models.File as Model<IFile>) || model<IFile>("File", fileSchema);

export default FileModel;
