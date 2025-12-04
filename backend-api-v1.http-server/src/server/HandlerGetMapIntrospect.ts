import { HandlerDeps } from "./HandlerPostEntryStep";
import { MapIntrospectorService } from "../mapmaster/map-introspector";
import { SemanticMap } from "../mapmaster/semantic-map.types";

export interface MapIntrospectResponse {
    success: boolean;
    data?: SemanticMap;
    error?: string;
}

export async function HandlerGetMapIntrospect(
    queryParams: Record<string, string>,
    deps: HandlerDeps
): Promise<MapIntrospectResponse> {
    const latex = queryParams["latex"];

    if (!latex) {
        return {
            success: false,
            error: 'Parameter "latex" is required'
        };
    }

    try {
        const map = MapIntrospectorService.introspect(latex, deps.invariantRegistry);
        return {
            success: true,
            data: map
        };
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
            success: false,
            error: message
        };
    }
}
