import { memo } from "react";
import {
  ClearSelectionButton,
  DownloadJsonButton,
  DownloadSessionButton,
  RebuildButton,
  ResetSessionButton,
} from "./buttons";

export const ControlToolbar = memo(() => {
  return (
    <>
      <RebuildButton />
      <DownloadJsonButton />
      <DownloadSessionButton />
      <ResetSessionButton />
      <ClearSelectionButton />
    </>
  );
});

export default ControlToolbar;
