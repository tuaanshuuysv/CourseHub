import mongoose from 'mongoose';

// Thiet lap ket noi toi co so du lieu MongoDB voi gioi han thoi gian cho
export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coursehub';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

// Dong ket noi MongoDB an toan khi dung tien trinh server
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB connection closed gracefully.');
  }
}
