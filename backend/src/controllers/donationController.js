import Donation from '../models/Donation.js';

export const trackDonation = async (req, res) => {
  try {
    const { donorId, requestId } = req.body;
    const donation = await Donation.create({ donorId, requestId });
    res.status(201).json(donation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
