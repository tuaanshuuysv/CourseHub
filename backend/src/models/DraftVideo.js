import mongoose from 'mongoose';

// Mo hinh du lieu luu vet tep video nhap khi giang vien tai len (Collection: draftvideos)
const draftVideoSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    contentType: { type: String, default: 'video/mp4', trim: true },
    expireAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Dung chi muc thuong (khong dung TTL) de Cron job xoa tep vat ly tren S3 truoc khi xoa ban ghi DB
draftVideoSchema.index({ expireAt: 1 });

export default mongoose.model('DraftVideo', draftVideoSchema);
