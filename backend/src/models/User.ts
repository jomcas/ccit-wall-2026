import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  firebaseUid: string;
  authProvider: 'password' | 'google.com' | 'github.com' | 'microsoft.com';
  emailVerified: boolean;
  role: 'student' | 'teacher' | 'admin';
  bio?: string;
  profilePicture?: string;
  contactInformation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    firebaseUid: { type: String, required: true, unique: true },
    authProvider: {
      type: String,
      enum: ['password', 'google.com', 'github.com', 'microsoft.com'],
      default: 'password',
    },
    emailVerified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
    },
    bio: { type: String },
    profilePicture: { type: String },
    contactInformation: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
