import { injectable } from 'tsyringe';
import { ISurfaceMapSerializer } from '../interfaces';
import { SurfaceMap, SurfaceNode } from '../types';

@injectable()
export class SurfaceMapSerializerService implements ISurfaceMapSerializer {
  nodeToPlain(node: SurfaceNode): object {
    return {
      id: node.id,
      kind: node.kind,
      role: node.role,
      operatorIndex: node.operatorIndex,
      bbox: node.bbox,
      latexFragment: node.latexFragment,
      children: node.children.map((child) => this.nodeToPlain(child)),
    };
  }

  serialize(map: SurfaceMap): object {
    return {
      root: this.nodeToPlain(map.root),
    };
  }
}
