import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TESTS, useVisualizerStore } from "../store";

export function ControlPanel() {
  const { latex, testIndex, setLatex, setTestIndex } = useVisualizerStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Test Case:</label>
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={testIndex}
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              setTestIndex(idx);
              setLatex(TESTS[idx]);
            }}
          >
            {TESTS.map((t, i) => (
              <option key={i} value={i}>
                T{i} · {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setLatex(latex + " ")}>Rebuild Map</Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Manual LaTeX:</label>
          <div className="flex gap-2">
            <Textarea
              value={latex}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setLatex(e.target.value)
              }
              className="font-mono text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
