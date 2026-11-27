import fs from 'node:fs';
import path from 'node:path';
import DraftVideo from '../models/DraftVideo.js';
import { VIDEOS_DIR } from '../middleware/upload.js';

const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// Quet va don dep cac video nhap da het han: xoa tep vat ly tren o dia truoc khi xoa ban ghi DB
export async function cleanupExpiredDraftVideos() {
  const expiredDocs = await DraftVideo.find({
    expireAt: { $ne: null, $lte: new Date() },
  });

  let deletedFiles = 0;
  let deletedRecords = 0;

  for (const doc of expiredDocs) {
    const rawKey = String(doc.key || '');
    const safeKey = path.basename(rawKey);

    if (safeKey && safeKey === rawKey) {
      const filePath = path.join(VIDEOS_DIR, safeKey);
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
          deletedFiles += 1;
        } catch (err) {
          if (err?.code !== 'ENOENT') {
            console.error(`Failed to delete expired draft video file ${safeKey}:`, err.message);
            // Khong xoa ban ghi DB neu xoa tep that bai de lan quet sau tiep tuc thu lai
            continue;
          }
        }
      }
    }

    await DraftVideo.deleteOne({ _id: doc._id });
    deletedRecords += 1;
  }

  return {
    scanned: expiredDocs.length,
    deletedFiles,
    deletedRecords,
  };
}

// Khoi chay tac vu don dep dinh ky video nhap het han va tra ve ham dung an toan khi tat server
export function startDraftVideoCleanupScheduler(intervalMs = DEFAULT_CLEANUP_INTERVAL_MS) {
  const runCleanup = async () => {
    try {
      const summary = await cleanupExpiredDraftVideos();
      if (summary.deletedRecords > 0 || summary.deletedFiles > 0) {
        console.log(
          `DraftVideo cleanup: removed ${summary.deletedFiles} file(s) and ${summary.deletedRecords} record(s)`
        );
      }
    } catch (err) {
      console.error('DraftVideo cleanup failed:', err.message);
    }
  };

  // Chay mot lan ngay sau khi ket noi CSDL thanh cong
  runCleanup();

  const timer = setInterval(runCleanup, intervalMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return () => {
    clearInterval(timer);
  };
}
