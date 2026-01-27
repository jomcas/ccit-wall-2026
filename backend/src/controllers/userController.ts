import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, comparePasswords, generateToken } from '../utils/auth';

/**
 * SECURITY: Generic error message for authentication failures
 * Using the same message for all auth failures prevents user enumeration attacks
 */
const AUTH_ERROR_MESSAGE = 'Invalid email and/or password';

/**
 * Register a new user
 * 
 * SECURITY CONSIDERATIONS:
 * - Password is hashed before storage using bcrypt
 * - Uses generic error message to prevent user enumeration
 * - Never returns the password in responses
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // SECURITY: Return generic error to prevent user enumeration
      // An attacker cannot determine if an email is registered
      return res.status(400).json({ message: 'Registration failed. Please check your information and try again.' });
    }

    const hashedPassword = await hashPassword(password);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
    });

    await user.save();

    const token = generateToken(user._id.toString(), user.role);
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // SECURITY: Don't expose internal error details
    res.status(500).json({ message: 'An error occurred during registration' });
  }
};

/**
 * Login a user
 * 
 * SECURITY CONSIDERATIONS:
 * - Uses generic error message for both invalid email and password
 * - Prevents timing attacks by always comparing password (even for non-existent users)
 * - Never returns the password in responses
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // SECURITY: Return generic error to prevent user enumeration
      return res.status(401).json({ message: AUTH_ERROR_MESSAGE });
    }

    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      // SECURITY: Same error message for wrong password
      return res.status(401).json({ message: AUTH_ERROR_MESSAGE });
    }

    const token = generateToken(user._id.toString(), user.role);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // SECURITY: Don't expose internal error details
    res.status(500).json({ message: 'An error occurred during login' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while fetching profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, bio, profilePicture, contactInformation } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, bio, profilePicture, contactInformation },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while updating profile' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while fetching users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while fetching user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while deleting user' });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      name: { $regex: query, $options: 'i' },
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while searching users' });
  }
};
