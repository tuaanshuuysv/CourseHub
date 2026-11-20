import mongoose from 'mongoose';

// Mo hinh du lieu luu vet tep video nhap khi giang vien tai len (Collection: draftvideos)
const draftVideoSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    contentType: { type: String, default: 'video/mp4' },
    expireAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('DraftVideo', draftVideoSchema);
