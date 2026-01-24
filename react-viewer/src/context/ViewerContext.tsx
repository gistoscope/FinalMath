import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { TESTS } from "../app/core/state.js";
import type { ViewerAction, ViewerState } from "../types/viewer-state";

const initialState: ViewerState = {
  formula: {
    latex: (TESTS as string[])[0] || "",
    isRendering: false,
    manualInput: (TESTS as string[])[0] || "",
  },
  debug: {
    hover: { target: null, lastClick: null },
    stepHint: null,
    engine: {
      lastClientEvent: null,
      lastEngineRequest: null,
      lastEngineResponse: null,
    },
    tsa: {
      lastTsa: null,
      log: [],
    },
  },
  system: {
    logs: [],
    surfaceMapJson: null,
    activeTestId: "0",
  },
};

function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case "SET_LATEX":
      return { ...state, formula: { ...state.formula, latex: action.payload } };
    case "SET_IS_RENDERING":
      return {
        ...state,
        formula: { ...state.formula, isRendering: action.payload },
      };
    case "SET_MANUAL_INPUT":
      return {
        ...state,
        formula: { ...state.formula, manualInput: action.payload },
      };
    case "UPDATE_HOVER":
      return {
        ...state,
        debug: {
          ...state.debug,
          hover: { ...state.debug.hover, ...action.payload },
        },
      };
    case "UPDATE_STEP_HINT":
      return { ...state, debug: { ...state.debug, stepHint: action.payload } };
    case "UPDATE_ENGINE":
      return {
        ...state,
        debug: {
          ...state.debug,
          engine: { ...state.debug.engine, ...action.payload },
        },
      };
    case "UPDATE_TSA":
      return {
        ...state,
        debug: {
          ...state.debug,
          tsa: { ...state.debug.tsa, ...action.payload },
        },
      };
    case "ADD_LOG":
      return {
        ...state,
        system: {
          ...state.system,
          logs: [...state.system.logs, action.payload],
        },
      };
    case "CLEAR_LOGS":
      return { ...state, system: { ...state.system, logs: [] } };
    case "SET_SURFACE_MAP":
      return {
        ...state,
        system: { ...state.system, surfaceMapJson: action.payload },
      };
    case "SET_ACTIVE_TEST":
      return {
        ...state,
        system: { ...state.system, activeTestId: action.payload },
      };
    case "RESET_STATE":
      return initialState;
    default:
      return state;
  }
}

interface ViewerContextType {
  state: ViewerState;
  dispatch: React.Dispatch<ViewerAction>;
  actions: {
    setLatex: (latex: string) => void;
    setManualInput: (input: string) => void;
    setActiveTest: (testId: string) => void;
    clearLogs: () => void;
  };
}

const ViewerContext = createContext<ViewerContextType | null>(null);

export const ViewerProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(viewerReducer, initialState);

  const actions = useMemo(
    () => ({
      setLatex: (latex: string) =>
        dispatch({ type: "SET_LATEX", payload: latex }),
      setManualInput: (input: string) =>
        dispatch({ type: "SET_MANUAL_INPUT", payload: input }),
      setActiveTest: (testId: string) =>
        dispatch({ type: "SET_ACTIVE_TEST", payload: testId }),
      clearLogs: () => dispatch({ type: "CLEAR_LOGS" }),
    }),
    [],
  );

  return (
    <ViewerContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </ViewerContext.Provider>
  );
};

export const useViewer = () => {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error("useViewer must be used within a ViewerProvider");
  }
  return context;
};
