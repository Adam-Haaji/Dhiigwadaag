// Eligibility ML Model Integration Controller

/**
 * POST /api/eligibility/check
 * Checks donor eligibility using ML model API
 * 
 * Request body:
 * {
 *   "gender": "Male",
 *   "bloodGroup": "A+",
 *   "hb": 13.5,
 *   "weightKg": 60,
 *   "medicalCondition": "None",
 *   "age": 25,
 *   "district": "Hodan"
 * }
 * 
 * Response:
 * {
 *   "eligible": true/false/null,
 *   "reason": "string",
 *   "confidence": number/null
 * }
 */
export const checkEligibility = async (req, res) => {
  try {
    const { gender, bloodGroup, hb, weightKg, medicalCondition, age, district } = req.body || {};

    // Validate required fields
    if (!gender || !bloodGroup || hb === undefined || !weightKg || !medicalCondition || !age || !district) {
      return res.status(400).json({ 
        error: 'Missing required fields: gender, bloodGroup, hb, weightKg, medicalCondition, age, district' 
      });
    }

    // Model logic: If medicalCondition !== "None" → immediate NOT eligible
    if (medicalCondition && String(medicalCondition).trim() !== 'None') {
      return res.json({
        eligible: false,
        reason: 'Medical condition not suitable for donation',
        confidence: 1
      });
    }

    // If medicalCondition === "None", call ML model
    const apiUrl = process.env.ELIGIBILITY_API_URL;
    if (!apiUrl) {
      // If API URL not configured, return pending status
      return res.json({
        eligible: null,
        reason: 'Eligibility service not configured',
        confidence: null
      });
    }

    try {
      // Prepare request body for ML model
      const modelRequestBody = {
        gender: String(gender).charAt(0).toUpperCase() + String(gender).slice(1).toLowerCase(),
        bloodGroup: String(bloodGroup).toUpperCase(),
        hb: Number(hb),
        weightKg: Number(weightKg),
        medicalCondition: String(medicalCondition),
        age: Number(age),
        district: String(district)
      };

      // Call ML model API
      // Create timeout controller for fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelRequestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`ML model API returned status ${response.status}`);
      }

      const modelResponse = await response.json();

      // Normalize model response
      // Model may return different formats, so we normalize to our standard format
      const eligible = modelResponse.eligible !== undefined 
        ? Boolean(modelResponse.eligible) 
        : (modelResponse.prediction === 'eligible' || modelResponse.prediction === true);
      
      const confidence = modelResponse.confidence !== undefined 
        ? Number(modelResponse.confidence) 
        : (modelResponse.score !== undefined ? Number(modelResponse.score) : null);
      
      const reason = modelResponse.reason || modelResponse.message || 
        (eligible ? 'Eligible to donate' : 'Not eligible to donate');

      return res.json({
        eligible,
        reason,
        confidence,
        raw: modelResponse // Store full response for debugging
      });

    } catch (error) {
      // If ML model API call fails, do NOT break donor registration
      // Return pending status
      console.error('[Eligibility] ML model API error:', error?.message || error);
      return res.json({
        eligible: null,
        reason: 'Eligibility service unavailable',
        confidence: null,
        error: error?.message || 'Service error'
      });
    }

  } catch (err) {
    console.error('[Eligibility] Check error:', err?.message || err);
    return res.status(500).json({ 
      error: err.message,
      eligible: null,
      reason: 'Internal server error',
      confidence: null
    });
  }
};
