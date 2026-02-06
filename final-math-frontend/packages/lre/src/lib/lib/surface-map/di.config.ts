import { container, Lifecycle } from 'tsyringe';
import { SurfaceNodeFactory } from './core/surface-node.factory';
import { HitTesterService } from './interaction/hit-tester.service';
import { OperandFinderService } from './interaction/operand-finder.service';
import { SurfaceMapBuilderService } from './parsing/builder.service';
import { ElementClassifierService } from './parsing/classifier.service';
import { ContentSegmenterService } from './parsing/content-segmenter.service';
import { SurfaceMapEnhancerService } from './processing/enhancer.service';
import { OperatorNormalizerService } from './processing/operator-normalizer.service';
import { BBoxService } from './utils/bbox.service';
import { SurfaceMapSerializerService } from './utils/serializer.service';

// Register Core Services
container.register(
  'ISurfaceNodeFactory',
  { useClass: SurfaceNodeFactory },
  { lifecycle: Lifecycle.Singleton },
);

// Register Utility Services
container.register(
  'IBBoxService',
  { useClass: BBoxService },
  { lifecycle: Lifecycle.Singleton },
);
container.register(
  'IOperatorNormalizer',
  { useClass: OperatorNormalizerService },
  { lifecycle: Lifecycle.Singleton },
);
container.register(
  'ISurfaceMapSerializer',
  { useClass: SurfaceMapSerializerService },
  { lifecycle: Lifecycle.Singleton },
);

// Register Parsing Services
container.register(
  'IElementClassifier',
  { useClass: ElementClassifierService },
  { lifecycle: Lifecycle.Singleton },
);
container.register(
  'IContentSegmenter',
  { useClass: ContentSegmenterService },
  { lifecycle: Lifecycle.Singleton },
);
container.register(
  'ISurfaceMapBuilder',
  { useClass: SurfaceMapBuilderService },
  { lifecycle: Lifecycle.Singleton },
);

// Register Interaction/Processing Services
container.register(
  'IHitTester',
  { useClass: HitTesterService },
  { lifecycle: Lifecycle.Singleton },
);
container.register(
  'IOperandFinder',
  { useClass: OperandFinderService },
  { lifecycle: Lifecycle.Singleton },
);
container.register(
  'ISurfaceMapEnhancer',
  { useClass: SurfaceMapEnhancerService },
  { lifecycle: Lifecycle.Singleton },
);

export { container };
