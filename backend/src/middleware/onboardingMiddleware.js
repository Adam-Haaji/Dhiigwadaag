import User from '../models/User.js';
import Donor from '../models/Donor.js';

/**
 * Middleware to check if user needs role selection (role is 'none')
 */
export const requireRoleSelection = async (req, res, next) => {
  try {
    const userId = req?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const user = await User.findById(userId).select('role');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const role = String(user.role || '').toLowerCase();
    if (role === 'none') {
      return res.status(403).json({ 
        error: 'role_selection_required',
        message: 'Please select a role (donor or requester) before accessing this resource'
      });
    }
    
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Middleware to check if donor registration is complete
 * Only applies to users with role 'donor'
 */
export const requireDonorRegistration = async (req, res, next) => {
  try {
    const userId = req?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const user = await User.findById(userId).select('role');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const role = String(user.role || '').toLowerCase();
    if (role !== 'donor') {
      return next(); // Not a donor, skip this check
    }
    
    // Check if donor record exists
    const donor = await Donor.findOne({ user: userId });
    if (!donor) {
      return res.status(403).json({ 
        error: 'donor_registration_required',
        message: 'Please complete donor registration before accessing donor features'
      });
    }
    
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Combined middleware: require role selection AND donor registration if donor
 */
export const requireOnboardingComplete = async (req, res, next) => {
  try {
    const userId = req?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const user = await User.findById(userId).select('role');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const role = String(user.role || '').toLowerCase();
    
    // Check role selection
    if (role === 'none') {
      return res.status(403).json({ 
        error: 'role_selection_required',
        message: 'Please select a role (donor or requester) first'
      });
    }
    
    // Check donor registration if donor
    if (role === 'donor') {
      const donor = await Donor.findOne({ user: userId });
      if (!donor) {
        return res.status(403).json({ 
          error: 'donor_registration_required',
          message: 'Please complete donor registration first'
        });
      }
    }
    
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
