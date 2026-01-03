import axios from 'axios';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "http://localhost:4202";

export async function callBackendAPI(method: string, endpoint: string, data: any) {
    try {
        const url = `${BACKEND_BASE_URL}${endpoint}`;
        const response = await axios({
            method,
            url,
            data,
            validateStatus: () => true // Accept all status codes to pass through backend errors
        });
        return response.data;
    } catch (error: any) {
        throw new Error(`Backend request failed: ${error.message}`);
    }
}
