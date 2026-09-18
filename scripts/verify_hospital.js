import axios from "axios";

const API_URL = "https://talk2doc-be.onrender.com/api";
const FIXED_OTP = "123";

async function runVerification() {
    try {
        console.log("🚀 Starting Verification...");

        // 1. Signup Hospital
        const phone = "9999988888";
        const hospitalName = "Test Hospital " + Date.now();
        console.log("➡️ Signing up Hospital:", hospitalName);

        try {
            await axios.post(`${API_URL}/auth/signup`, {
                name: hospitalName,
                phone: phone,
                role: "HOSPITAL",
                gender: "Private", // Required by older schema?
            });
        } catch (e) {
            if (e.response && e.response.data.error.includes("exists")) {
                console.log("ℹ️ Hospital already exists, proceeding to login.");
            } else {
                throw e;
            }
        }

        // 2. Login Hospital
        console.log("➡️ Logging in Hospital...");
        await axios.post(`${API_URL}/auth/login`, { phone });
        // Verify OTP
        const verifyRes = await axios.post(`${API_URL}/auth/verify-otp`, { phone, otp: FIXED_OTP });
        const token = verifyRes.data.token;
        console.log("✅ Logged in. Token received.");

        // 3. Add Doctor
        console.log("➡️ Adding Doctor...");
        const doctorPhone = "8888877777";
        try {
            const addDocRes = await axios.post(
                `${API_URL}/hospital/add-doctor`,
                {
                    name: "Dr. Test",
                    phone: doctorPhone,
                    specialization: "Cardiology",
                    licenseNumber: "LIC-" + Date.now(),
                    availability: [{ day: "Monday", startTime: "09:00", endTime: "17:00" }],
                    experience: 10
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log("✅ Doctor Added:", addDocRes.data.doctor.name);
        } catch (e) {
            if (e.response && e.response.data.error.includes("exists")) {
                console.log("ℹ️ Doctor with phone already exists.");
            } else {
                throw e;
            }
        }

        // 4. Get Doctors
        console.log("➡️ Fetching Hospital Doctors...");
        const getDocsRes = await axios.get(`${API_URL}/hospital/doctors`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ Doctors found:", getDocsRes.data.count);

        if (getDocsRes.data.count > 0) {
            console.log("🎉 VERIFICATION PASSED!");
        } else {
            console.error("❌ VERIFICATION FAILED: No doctors found.");
        }

    } catch (error) {
        console.error("❌ Verification Failed:", error.message);
        if (error.response) {
            console.error("Response:", error.response.data);
        }
    }
}

runVerification();
