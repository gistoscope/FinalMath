import { useState } from "react";
import { useStoreActions } from "../../../store/useViewerStore";
import { defaultOptions, TESTS } from "./constants";

export const TestSelector = () => {
  const [activeId, setActinId] = useState<string>("0");

  const { setLatex } = useStoreActions();

  return (
    <>
      <label htmlFor="test-select" style={{ marginRight: "8px" }}>
        Test:
      </label>
      <select
        id="test-select"
        value={activeId}
        onChange={(e) => {
          setActinId(e.target.value);
          setLatex(TESTS[Number(e.target.value)]);
        }}
      >
        {defaultOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
};
