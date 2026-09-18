import InsuranceProvider from "../models/InsuranceProvider.js";

/* ===============================
   PUBLIC: Get active providers
================================ */
export const getPublicInsuranceProviders = async (req, res) => {
  try {
    const providers = await InsuranceProvider.find({ active: true })
      .sort({ name: 1 })
      .select("name");

    res.json({
      success: true,
      providers,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch insurance providers",
    });
  }
};

/* ===============================
   ADMIN: Create provider
================================ */
export const createInsuranceProvider = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: "Name is required" });

    const exists = await InsuranceProvider.findOne({ name });
    if (exists)
      return res.status(400).json({ message: "Provider already exists" });

    const provider = await InsuranceProvider.create({ name });

    res.json({ success: true, provider });
  } catch (err) {
    res.status(500).json({ message: "Failed to create provider" });
  }
};

/* ===============================
   ADMIN: Get all providers
================================ */
export const getAllInsuranceProviders = async (req, res) => {
  const providers = await InsuranceProvider.find().sort({ createdAt: -1 });
  res.json({ success: true, providers });
};

/* ===============================
   ADMIN: Update provider
================================ */
export const updateInsuranceProvider = async (req, res) => {
  const { id } = req.params;
  const { name, active } = req.body;

  const provider = await InsuranceProvider.findByIdAndUpdate(
    id,
    { name, active },
    { new: true }
  );

  res.json({ success: true, provider });
};

/* ===============================
   ADMIN: Delete provider
================================ */
export const deleteInsuranceProvider = async (req, res) => {
  await InsuranceProvider.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};
