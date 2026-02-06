import { useState } from 'react';
import { useStoreAction } from '../../store/useViewerStore';

export const TESTS = [
  { latex: String.raw`2+3`, label: 'T0 · Integers 2 + 3' },
  {
    latex: String.raw`\frac{1}{3}+\frac{2}{5}`,
    label: 'T1 · Simple fractions',
  },
  { latex: String.raw`\frac{1}{1+\frac{1}{2}}`, label: 'T2 · Nested fraction' },
  {
    latex: String.raw`-\left(\frac{3}{4}-\frac{1}{8}\right)`,
    label: 'T3 · Unary minus + brackets',
  },

  { latex: String.raw`12.5 + 0.75 - 3.125`, label: 'T4 · Decimals' },
  {
    latex: String.raw`1\frac{2}{3} + 2\frac{1}{5}`,
    label: 'T5 · Mixed numbers',
  },
  { latex: String.raw`2 + 3 - 1`, label: 'T6 · 2 + 3 - 1' },
  {
    latex: String.raw`\frac{1}{2} + \frac{1}{3} + \frac{1}{6}`,
    label: 'T7 · Three fractions',
  },
  {
    latex: String.raw`\left(1-\frac{1}{3}\right)\cdot\frac{3}{4}`,
    label: 'T8 · (1-1/3)·3/4',
  },
  {
    latex: String.raw`\frac{2}{5} - \left(\frac{1}{10}+\frac{3}{20}\right)`,
    label: 'T9 · 2/5 - (1/10+3/20)',
  },
  {
    latex: String.raw`\left(\frac{1}{2}+\frac{2}{3}\right)-\left(\frac{3}{4}-\frac{1}{5}\right)`,
    label: 'T10 · Two bracketed groups',
  },
  {
    latex: String.raw`1.2 + \frac{3}{5} - 0.4`,
    label: 'T11 · Mixed decimals & fractions',
  },
  {
    latex: String.raw`\frac{1}{2} + \left(\frac{3}{4} - \frac{1}{1+\frac{1}{2}}\right)`,
    label: 'T12 · Stress nested',
  },
  {
    latex: String.raw`\left(\frac{5}{6} - \frac{1}{3}\right) + \frac{7}{8}`,
    label: 'T13 · Extra mix',
  },
  {
    latex: String.raw`\frac{1}{7} + \frac{3}{7}`,
    label: 'T14 · Fraction Addition Same Denom',
  },
  {
    latex: String.raw`\frac{5}{9} - \frac{2}{9}`,
    label: 'T15 · Fraction Subtraction Same Denom',
  },
];

export function Actions() {
  const { setLatex } = useStoreAction();

  const [selected, setSelect] = useState<string>('');

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">Toolbar</h2>
      </div>
      <div className="p-4 flex flex-wrap items-center gap-3">
        <div className="">
          <select
            id="test-select"
            className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={selected}
            onChange={(e) => {
              setSelect(e.target.value);
              setLatex(e.target.value);
            }}
          >
            {TESTS.map((test, index) => (
              <option key={index} value={test.latex}>
                {test.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
