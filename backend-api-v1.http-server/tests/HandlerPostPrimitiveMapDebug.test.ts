import { describe, it, expect, vi } from "vitest";
import { handlePostPrimitiveMapDebug } from "../src/server/HandlerPostPrimitiveMapDebug";
import { IncomingMessage, ServerResponse } from "node:http";

describe("HandlerPostPrimitiveMapDebug", () => {
    it("returns a Primitive Map for 1/7 + 3/7", async () => {
        const body = {
            expressionLatex: "\\frac{1}{7} + \\frac{3}{7}",
            stage: 1,
        };

        const req = {} as IncomingMessage;
        const res = {
            statusCode: 0,
            setHeader: vi.fn(),
            end: vi.fn(),
        } as unknown as ServerResponse;

        await handlePostPrimitiveMapDebug(req, res, body);

        expect(res.statusCode).toBe(200);
        expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/json; charset=utf-8");

        const responseBody = JSON.parse((res.end as any).mock.calls[0][0]);
        expect(responseBody.status).toBe("ok");
        expect(responseBody.map).toBeDefined();

        const map = responseBody.map;
        expect(map.operatorCount).toBe(1);
        expect(map.entries[0].primitiveId).toBe("FRAC_ADD_SAME_DEN_STAGE1");
        expect(map.entries[0].status).toBe("ready");
    });

    it("returns error when expressionLatex is missing", async () => {
        const body = {};

        const req = {} as IncomingMessage;
        const res = {
            statusCode: 0,
            setHeader: vi.fn(),
            end: vi.fn(),
        } as unknown as ServerResponse;

        await handlePostPrimitiveMapDebug(req, res, body);

        expect(res.statusCode).toBe(400);

        const responseBody = JSON.parse((res.end as any).mock.calls[0][0]);
        expect(responseBody.status).toBe("error");
        expect(responseBody.errorMessage).toBe("expressionLatex is required");
    });
});
