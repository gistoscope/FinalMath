import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";
import { Tokens } from "./tokens";

// Core
import { DebugClient } from "../core/api/clients/DebugClient";
import { IntrospectClient } from "../core/api/clients/IntrospectClient";
import { OrchestratorClient } from "../core/api/clients/OrchestratorClient";
import { FileBus } from "../core/bus/FileBus";
import { Logger } from "../core/logging/Logger";

// Store
import { StoreService } from "../store/StoreService";

// Domain - Math
import { MathEngine } from "../domain/math/engine/MathEngine";
import { LatexInstrumenter } from "../domain/math/instrumentation/LatexInstrumenter";
import { AstTraverser } from "../domain/math/parser/AstTraverser";
import { Parser } from "../domain/math/parser/Parser";
import { Tokenizer } from "../domain/math/parser/Tokenizer";

// Domain - Surface Map
import { KaTeXMapBuilder } from "../domain/surface-map/builders/KaTeXMapBuilder";
import { ContentSegmenter } from "../domain/surface-map/providers/ContentSegmenter";
import { GeometryProvider } from "../domain/surface-map/providers/GeometryProvider";
import { NodeClassifier } from "../domain/surface-map/providers/NodeClassifier";
import { SurfaceNodeFactory } from "../domain/surface-map/providers/SurfaceNodeFactory";
import { SurfaceMapEngine } from "../domain/surface-map/SurfaceMapEngine";

// Domain - Selection / Interaction
import { GestureProcessor } from "../domain/interaction/GestureProcessor";
import { IntegerCycleManager } from "../domain/interaction/IntegerCycleManager";
import { InteractionService } from "../domain/interaction/InteractionService";
import { SelectionService } from "../domain/selection/SelectionService";

// Features
import { EngineBridge } from "../features/engine-bridge/EngineBridge";
import { ExportService } from "../features/exporting/ExportService";
import { IntrospectRenderer } from "../features/introspection/IntrospectRenderer";
import { TokenStripManager } from "../features/introspection/TokenStripManager";
import { P1Service } from "../features/p1/P1Service";
import { TestRunnerService } from "../features/testing/TestRunnerService";
import { TraceRecorder } from "../features/trace-hub/TraceRecorder";

/**
 * setupDIContainer
 * Performs all singleton registrations for the application.
 */
export function setupDIContainer() {
  // --- Core ---
  container.register(
    Tokens.IFileBus,
    { useClass: FileBus },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    Tokens.ILogger,
    { useClass: Logger },
    { lifecycle: Lifecycle.Singleton },
  );

  // API Clients (registered as concrete classes for specific feature usage)
  container.register(
    OrchestratorClient,
    { useClass: OrchestratorClient },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    IntrospectClient,
    { useClass: IntrospectClient },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    DebugClient,
    { useClass: DebugClient },
    { lifecycle: Lifecycle.Singleton },
  );

  // --- Store ---
  container.register(
    Tokens.IStoreService,
    { useClass: StoreService },
    { lifecycle: Lifecycle.Singleton },
  );

  // --- Domain - Math ---
  container.register(
    Tokens.ITokenizer,
    { useClass: Tokenizer },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    Tokens.IMathParser,
    { useClass: Parser },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    Tokens.IMathEngine,
    { useClass: MathEngine },
    { lifecycle: Lifecycle.Singleton },
  );

  // Internal domain helpers
  container.register(
    AstTraverser,
    { useClass: AstTraverser },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    LatexInstrumenter,
    { useClass: LatexInstrumenter },
    { lifecycle: Lifecycle.Singleton },
  );

  // --- Domain - Surface Map ---
  container.register(
    Tokens.IGeometryProvider,
    { useClass: GeometryProvider },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    Tokens.INodeClassifier,
    { useClass: NodeClassifier },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    Tokens.IMapBuilder,
    { useClass: KaTeXMapBuilder },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    Tokens.IMapEngine,
    { useClass: SurfaceMapEngine },
    { lifecycle: Lifecycle.Singleton },
  );

  // Internal providers
  container.register(
    ContentSegmenter,
    { useClass: ContentSegmenter },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    SurfaceNodeFactory,
    { useClass: SurfaceNodeFactory },
    { lifecycle: Lifecycle.Singleton },
  );

  // --- Domain - Interaction ---
  container.register(
    Tokens.ISelectionService,
    { useClass: SelectionService },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    Tokens.IInteractionService,
    { useClass: InteractionService },
    { lifecycle: Lifecycle.Singleton },
  );

  container.register(
    GestureProcessor,
    { useClass: GestureProcessor },
    { lifecycle: Lifecycle.Singleton },
  );

  container.register(
    IntegerCycleManager,
    { useClass: IntegerCycleManager },
    { lifecycle: Lifecycle.Singleton },
  );

  // --- Features ---
  container.register(
    EngineBridge,
    { useClass: EngineBridge },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    IntrospectRenderer,
    { useClass: IntrospectRenderer },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    TokenStripManager,
    { useClass: TokenStripManager },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    Tokens.ITraceRecorder,
    { useClass: TraceRecorder },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register(
    ExportService,
    { useClass: ExportService },
    { lifecycle: Lifecycle.Singleton },
  );

  container.register(
    P1Service,
    { useClass: P1Service },
    { lifecycle: Lifecycle.Singleton },
  );

  container.register(
    TestRunnerService,
    { useClass: TestRunnerService },
    { lifecycle: Lifecycle.Singleton },
  );
}
