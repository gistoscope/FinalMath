/* eslint-disable @typescript-eslint/no-explicit-any */
import { singleton } from "tsyringe";

@singleton()
export class ExportService {
  /**
   * Download data as a JSON file.
   */
  public downloadJson(data: unknown, fileName: string): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    this._triggerDownload(blob, fileName);
  }

  /**
   * Download a list of objects as a JSONL file.
   */
  public downloadJsonl(items: unknown[], fileName: string): void {
    const lines = items.map((item: any) => JSON.stringify(item));
    const content = lines.join("\n") + "\n";
    const blob = new Blob([content], { type: "application/json" });
    this._triggerDownload(blob, fileName);
  }

  private _triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
