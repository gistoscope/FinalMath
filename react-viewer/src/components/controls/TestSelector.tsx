import React from "react";
import { useViewerStore } from "../../store/useViewerStore";

interface TestOption {
  label: string;
  value: string | number;
}

const defaultOptions: TestOption[] = [
  { label: "T14 · Fraction Addition Same Denom", value: "0" },
  { label: "T15 · Fraction Subtraction Same Denom", value: "1" },
  { label: "T0 · Integers 2 + 3", value: "2" },
  { label: "T1 · Simple fractions", value: "3" },
  { label: "T2 · Nested fraction", value: "4" },
  { label: "T3 · Unary minus + brackets", value: "5" },
  { label: "T4 · Decimals", value: "6" },
  { label: "T5 · Mixed numbers", value: "7" },
  { label: "T6 · 2 + 3 - 1", value: "8" },
  { label: "T7 · Three fractions", value: "9" },
  { label: "T8 · (1-1/3)·3/4", value: "10" },
  { label: "T9 · 2/5 - (1/10+3/20)", value: "11" },
  { label: "T10 · Two bracketed groups", value: "12" },
  { label: "T11 · Mixed decimals & fractions", value: "13" },
  { label: "T12 · Stress nested", value: "14" },
  { label: "T13 · Extra mix", value: "15" },
];

const TestSelector: React.FC = () => {
  const activeTestId = useViewerStore((state) => state.system.activeTestId);
  const { setActiveTest } = useViewerStore((state) => state.actions);

  return (
    <>
      <label htmlFor="test-select" style={{ marginRight: "8px" }}>
        Test:
      </label>
      <select
        id="test-select"
        value={activeTestId}
        onChange={(e) => setActiveTest(e.target.value)}
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

export default TestSelector;
