import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  title: string;
  description: string;
  author: mongoose.Types.ObjectId;
  category: 'college-activities' | 'general' | 'extracurricular';
  isAnonymous: boolean;
  attachments?: string[];
  likes: mongoose.Types.ObjectId[];
  reactions: Map<string, mongoose.Types.ObjectId[]>;
  comments: mongoose.Types.ObjectId[];
  shares: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['college-activities', 'general', 'extracurricular'],
      required: true,
    },
    isAnonymous: { type: Boolean, default: false },
    attachments: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: {
      type: Map,
      of: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: new Map(),
    },
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    shares: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model<IPost>('Post', PostSchema);
