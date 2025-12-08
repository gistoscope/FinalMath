import { Request, Response } from 'express';
import { callBackendAPI } from './backend.client';

export async function handleEngineRequest(req: Request, res: Response) {
    try {
        const { type, ...payload } = req.body;

        if (!type) {
            return res.status(400).json({
                status: "error",
                error: "Missing request type"
            });
        }

        let result;

        switch (type) {
            case "applyStep":
                result = await callBackendAPI("POST", "/api/entry-step", payload);
                break;
            case "getHints":
                result = await callBackendAPI("POST", "/api/hint-request", payload);
                break;
            case "undoLastStep":
                result = await callBackendAPI("POST", "/api/undo-step", payload);
                break;
            case "parse":
                // Echo input for now
                result = {
                    status: "ok",
                    expressionLatex: payload.expressionLatex
                };
                break;
            case "previewStep":
                result = {
                    status: "preview-not-implemented",
                    message: "Preview not implemented in this adapter"
                };
                break;
            default:
                return res.status(400).json({
                    status: "error",
                    error: `Unknown request type: ${type}`
                });
        }

        res.json(result);

    } catch (error: any) {
        console.error("Adapter Error:", error);
        res.status(200).json({
            status: "error",
            code: "backend-transport-error",
            details: error.message
        });
    }
}
