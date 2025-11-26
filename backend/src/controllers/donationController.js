import Donation from '../models/Donation.js';
import Donor from '../models/Donor.js';

export const trackDonation = async (req, res) => {
  try {
    const { donorId, requestId } = req.body;
    const donation = await Donation.create({ donorId, requestId });
    res.status(201).json(donation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/donations/mine - authenticated donor history summary
export const getMyDonations = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const donor = await Donor.findOne({ user: userId }).select('donations lastDonationDate nextAvailableDate availabilityStatus');
    if (!donor) return res.json({ donations: [], count: 0, lastDonationDate: null, nextAvailableDate: null, availabilityStatus: 'not_a_donor' });
    const list = (donor.donations || [])
      .slice()
      .sort((a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime())
      .map(d => ({ donationDate: d.donationDate, volumeMl: d.volumeMl, screeningClear: d.screeningClear }));
    return res.json({
      donations: list,
      count: list.length,
      lastDonationDate: donor.lastDonationDate || null,
      nextAvailableDate: donor.nextAvailableDate || null,
      availabilityStatus: donor.availabilityStatus,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
