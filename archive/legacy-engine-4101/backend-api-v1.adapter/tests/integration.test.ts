import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';
import * as backendClient from '../src/backend.client';

// Mock the backend client
vi.mock('../src/backend.client');

describe('HTTP Engine Adapter Integration', () => {

    it('GET /health returns 200 OK', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.text).toBe('ok');
    });

    it('POST /engine with type="applyStep" calls backend /api/entry-step', async () => {
        const mockResponse = { status: "step-applied", expressionLatex: "1+2" };
        vi.spyOn(backendClient, 'callBackendAPI').mockResolvedValue(mockResponse);

        const payload = {
            type: "applyStep",
            expressionLatex: "1+1",
            sessionId: "test-session"
        };

        const res = await request(app).post('/engine').send(payload);

        expect(backendClient.callBackendAPI).toHaveBeenCalledWith(
            "POST",
            "/api/entry-step",
            expect.objectContaining({ expressionLatex: "1+1" })
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockResponse);
    });

    it('POST /engine with type="getHints" calls backend /api/hint-request', async () => {
        const mockResponse = { status: "hint-found", hintText: "Try adding" };
        vi.spyOn(backendClient, 'callBackendAPI').mockResolvedValue(mockResponse);

        const payload = {
            type: "getHints",
            expressionLatex: "1+1",
            sessionId: "test-session"
        };

        const res = await request(app).post('/engine').send(payload);

        expect(backendClient.callBackendAPI).toHaveBeenCalledWith(
            "POST",
            "/api/hint-request",
            expect.objectContaining({ expressionLatex: "1+1" })
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockResponse);
    });

    it('POST /engine with type="undoLastStep" calls backend /api/undo-step', async () => {
        const mockResponse = { status: "undo-complete" };
        vi.spyOn(backendClient, 'callBackendAPI').mockResolvedValue(mockResponse);

        const payload = {
            type: "undoLastStep",
            sessionId: "test-session"
        };

        const res = await request(app).post('/engine').send(payload);

        expect(backendClient.callBackendAPI).toHaveBeenCalledWith(
            "POST",
            "/api/undo-step",
            expect.objectContaining({ sessionId: "test-session" })
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockResponse);
    });

    it('POST /engine with type="parse" echoes input', async () => {
        const payload = {
            type: "parse",
            expressionLatex: "1+1"
        };

        const res = await request(app).post('/engine').send(payload);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            status: "ok",
            expressionLatex: "1+1"
        });
    });

    it('POST /engine with type="previewStep" returns not implemented', async () => {
        const payload = {
            type: "previewStep",
            expressionLatex: "1+1"
        };

        const res = await request(app).post('/engine').send(payload);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("preview-not-implemented");
    });

    it('POST /engine handles backend errors gracefully', async () => {
        vi.spyOn(backendClient, 'callBackendAPI').mockRejectedValue(new Error("Network Error"));

        const payload = {
            type: "applyStep",
            expressionLatex: "1+1"
        };

        const res = await request(app).post('/engine').send(payload);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            status: "error",
            code: "backend-transport-error",
            details: "Network Error"
        });
    });
});
