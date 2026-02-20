import Requester from '../models/Requester.js';
import User from '../models/User.js';

// POST /api/requesters/register
// Creates a requester record linked to the user WITHOUT changing user.role
export const registerRequester = async (req, res) => {
  try {
    const userId = req?.user?.id || req?.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    // Get user profile (email, phone, name)
    const user = await User.findById(userId).select('_id name email phone').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if requester record already exists
    let requester = await Requester.findOne({ user: userId }).lean();
    if (requester) {
      // Already registered as requester, return existing record with user profile
      return res.status(200).json({ 
        requester, 
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        }
      });
    }
    
    // Create new requester record
    requester = await Requester.create({ user: userId });
    
    // Return requester record with user profile (for auto-loading in dashboard)
    return res.status(201).json({ 
      requester: requester.toObject(), 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      }
    });
  } catch (err) {
    console.error('[registerRequester] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/requesters/me
// Returns requester record with user profile (email, phone) for dashboard auto-loading
export const getMyRequester = async (req, res) => {
  try {
    const userId = req?.user?.id || req?.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const requester = await Requester.findOne({ user: userId }).lean();
    if (!requester) {
      return res.json({ exists: false, requester: null, user: null });
    }
    
    // Get user profile for auto-loading in dashboard
    const user = await User.findById(userId).select('_id name email phone').lean();
    
    return res.json({ 
      exists: true, 
      requester,
      user: user ? {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      } : null
    });
  } catch (err) {
    console.error('[getMyRequester] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};