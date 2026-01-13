import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DebugPanelProps {
  hoverInfo: string | null;
  clickInfo: string | null;
  hintDebug?: {
    currentLatex?: string;
    selectedSurfaceNodeId?: string;
    resolvedAstNodeId?: string;
    primitiveId?: string;
    lastChoiceStatus?: string;
    lastHintApplyStatus?: string;
    lastHintApplyError?: string;
  };
  tsaDebug?: any; // Define structure if available
  engineDebug?: {
    client?: string;
    request?: string;
    response?: string;
  };
}

export function DebugPanel({
  hoverInfo,
  clickInfo,
  hintDebug,
  tsaDebug,
  engineDebug,
}: DebugPanelProps) {
  // Use tsaDebug to suppress unused variable warning
  void tsaDebug;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Hover / Click debug</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div className="flex gap-2">
            <span className="font-medium text-muted-foreground w-24">
              Hover:
            </span>{" "}
            <span>{hoverInfo || "—"}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-muted-foreground w-24">
              Last click:
            </span>{" "}
            <span>{clickInfo || "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Engine Debug */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Engine debug (FileBus)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1 font-mono text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-muted-foreground">
              ClientEvent:
            </span>
            <span className="break-all">{engineDebug?.client || "—"}</span>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <span className="font-medium text-muted-foreground">
              EngineRequest:
            </span>
            <span className="break-all">{engineDebug?.request || "—"}</span>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <span className="font-medium text-muted-foreground">
              EngineResponse:
            </span>
            <span className="break-all">{engineDebug?.response || "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* P1 Hint Diagnostics (The floating black panel in original) */}
      {hintDebug && (
        <Card className="bg-black text-green-400 font-mono text-xs border-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-500">
              P1 HINT DIAGNOSTICS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 whitespace-pre-wrap leading-tight">
            <div>
              currentLatex:{" "}
              <span className="text-cyan-400">{hintDebug.currentLatex}</span>
            </div>
            <div>
              surfaceNodeId:{" "}
              <span className="text-yellow-400">
                {hintDebug.selectedSurfaceNodeId}
              </span>
            </div>
            <div>
              astNodeId:{" "}
              <span
                className={
                  hintDebug.resolvedAstNodeId === "MISSING"
                    ? "text-red-500"
                    : "text-lime-500"
                }
              >
                {hintDebug.resolvedAstNodeId}
              </span>
            </div>
            <div>
              primitiveId:{" "}
              <span className="text-orange-400">{hintDebug.primitiveId}</span>
            </div>

            <div className="mt-2 font-bold text-white">CHOICE FETCH</div>
            <div>
              status:{" "}
              <span
                className={
                  hintDebug.lastChoiceStatus === "choice"
                    ? "text-lime-500"
                    : "text-white"
                }
              >
                {hintDebug.lastChoiceStatus}
              </span>
            </div>

            <div className="mt-2 font-bold text-white">HINT APPLY</div>
            <div>
              status:{" "}
              <span
                className={
                  hintDebug.lastHintApplyStatus === "step-applied"
                    ? "text-lime-500"
                    : hintDebug.lastHintApplyStatus === "RUNNING"
                    ? "text-yellow-400"
                    : "text-white"
                }
              >
                {hintDebug.lastHintApplyStatus}
              </span>
            </div>
            <div>
              error:{" "}
              <span className="text-red-500">
                {hintDebug.lastHintApplyError || "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
